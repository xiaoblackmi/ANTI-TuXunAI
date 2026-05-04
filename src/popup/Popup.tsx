import { Compass, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import { PredictionCard } from "../components/PredictionCard";
import { callVisionModel } from "../lib/apiClient";
import { normalizeAnalysisResult } from "../lib/analysisResult";
import { sha256Text } from "../lib/hash";
import { captureCurrentTab } from "../lib/imageCapture";
import { compressImage } from "../lib/imageCompress";
import { buildDetailedGeoPrompt, buildFastGeoPrompt } from "../lib/promptBuilder";
import { getRecentLearnedRules, getSettings } from "../lib/storage";
import type { AnalysisMode, AppSettings, LastAnalysis } from "../lib/types";

const LAST_ANALYSIS_KEY = "geoAssistantLastAnalysis";

export function Popup() {
  const [mode, setMode] = useState<AnalysisMode>("fast");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<LastAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    void hydrate();
  }, []);

  async function hydrate() {
    setSettings(await getSettings());
    const stored = await chrome.storage.local.get(LAST_ANALYSIS_KEY);
    if (stored[LAST_ANALYSIS_KEY]) setLastAnalysis(stored[LAST_ANALYSIS_KEY] as LastAnalysis);
  }

  async function analyzeCurrentView() {
    setLoading(true);
    setError("");
    setStatus("正在截取当前可见街景画面...");

    try {
      const currentSettings = settings ?? (await getSettings());
      if (!currentSettings.apiKey.trim()) {
        throw new Error("请先在设置页填写 API Key。");
      }

      const screenshot = await captureCurrentTab();
      const maxSize = mode === "fast" ? 640 : 1024;
      const compressed = await compressImage(screenshot, maxSize, currentSettings.imageQuality);
      const screenshotHash = await sha256Text(compressed.slice(0, 200000));

      setStatus(mode === "fast" ? "快速模式：跳过历史规则，避免上一张图影响本次判断..." : "正在读取本地学习规则...");
      const learnedRules = currentSettings.enableHistoryRetrieval && mode === "detailed" ? await getRecentLearnedRules(6) : [];

      const prompt = mode === "fast" ? buildFastGeoPrompt(learnedRules) : buildDetailedGeoPrompt(learnedRules);
      setStatus(mode === "fast" ? "正在快速判断..." : "正在精准分析...");

      const response = await callVisionModel(compressed, prompt, {
        apiBaseUrl: currentSettings.apiBaseUrl,
        apiKey: currentSettings.apiKey,
        modelName: currentSettings.modelName,
        timeoutMs: currentSettings.timeoutMs,
        maxTokens: mode === "fast" ? 520 : 1100,
        useResponseFormat: currentSettings.useResponseFormat,
        debug: currentSettings.enableDebugLogs
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || "模型返回为空，请重试。");
      }

      const nextAnalysis: LastAnalysis = {
        createdAt: new Date().toISOString(),
        mode,
        screenshotHash,
        modelName: currentSettings.modelName,
        result: normalizeAnalysisResult(response.data)
      };

      await chrome.storage.local.set({ [LAST_ANALYSIS_KEY]: nextAnalysis });
      setLastAnalysis(nextAnalysis);
      try {
        await showFloatingPanel(nextAnalysis.result);
        setStatus("分析完成，右侧浮窗已更新。");
      } catch {
        setStatus("分析完成。当前页面无法注入浮窗，请查看插件面板结果。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败。");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  async function copyResult() {
    if (!lastAnalysis) return;
    await navigator.clipboard.writeText(JSON.stringify(lastAnalysis.result, null, 2));
    setStatus("分析结果已复制。");
  }

  return (
    <main className="popup-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">街景定位训练</span>
          <h1>图寻 AI 助手</h1>
          <p>只分析当前可见截图，不读取隐藏答案；复盘经验保存在本地。</p>
        </div>
        <button className="icon-button" type="button" onClick={openOptions} title="打开设置">
          <ExternalLink size={17} />
        </button>
      </header>

      <section className="toolbar">
        <div className="mode-toggle" role="group" aria-label="分析模式">
          <button className={mode === "fast" ? "active" : ""} type="button" onClick={() => setMode("fast")}>
            快速
          </button>
          <button className={mode === "detailed" ? "active" : ""} type="button" onClick={() => setMode("detailed")}>
            精准
          </button>
        </div>
        <button className="primary-button" type="button" disabled={loading} onClick={analyzeCurrentView}>
          {loading ? <Loader2 size={17} /> : <Compass size={17} />}
          {loading ? "分析中..." : "分析当前街景"}
        </button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {status ? <p className="status-line">{status}</p> : null}

      <PredictionCard result={lastAnalysis?.result ?? null} onCopy={lastAnalysis ? copyResult : undefined} />

      <section className="feedback-strip">
        <button className="feedback-cta" type="button" disabled={!lastAnalysis} onClick={() => setShowFeedback(true)}>
          学习反馈 / 复盘本局
        </button>
        <p>{lastAnalysis ? "填入正确答案和纠错说明，插件会总结成本地经验规则。" : "先完成一次分析，结束后这里会变成复盘入口。"}</p>
      </section>

      <div className="popup-footer">
        <button
          className="secondary-button"
          type="button"
          disabled={!lastAnalysis}
          onClick={() =>
            lastAnalysis &&
            showFloatingPanel(lastAnalysis.result).catch(() => {
              setError("当前页面不允许注入右侧浮窗。");
            })
          }
        >
          显示右侧浮窗
        </button>
      </div>

      {showFeedback ? (
        <FeedbackModal
          lastAnalysis={lastAnalysis}
          onClose={() => setShowFeedback(false)}
          onSaved={(message) => {
            setStatus(message);
            void hydrate();
          }}
        />
      ) : null}
    </main>
  );
}

async function showFloatingPanel(result: LastAnalysis["result"]) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content/contentScript.js"]
  });

  await chrome.tabs.sendMessage(tab.id, { type: "GEO_ASSISTANT_SHOW", result });
}
