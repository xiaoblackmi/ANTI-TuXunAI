import { Compass, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import { PredictionCard } from "../components/PredictionCard";
import { callVisionModel } from "../lib/apiClient";
import { buildRuleQueryFromAnalysis } from "../lib/analysisQuery";
import { retrieveRelevantRules } from "../lib/caseRetrieval";
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
    setStatus("Capturing and compressing the visible view...");

    try {
      const currentSettings = settings ?? (await getSettings());
      if (!currentSettings.apiKey.trim()) {
        throw new Error("Configure the API Key in Options first.");
      }

      const screenshot = await captureCurrentTab();
      const maxSize = mode === "fast" ? 768 : 1280;
      const compressed = await compressImage(screenshot, maxSize, currentSettings.imageQuality);
      const screenshotHash = await sha256Text(compressed.slice(0, 200000));

      setStatus("Reading local learned rules...");
      const learnedRules = currentSettings.enableHistoryRetrieval
        ? mode === "fast"
          ? await getRecentLearnedRules(5)
          : await retrieveRelevantRules(buildRuleQueryFromAnalysis(lastAnalysis?.result), 10)
        : [];

      const prompt = mode === "fast" ? buildFastGeoPrompt(learnedRules) : buildDetailedGeoPrompt(learnedRules);
      setStatus(mode === "fast" ? "Running fast analysis..." : "Running detailed analysis...");

      const response = await callVisionModel(compressed, prompt, {
        apiBaseUrl: currentSettings.apiBaseUrl,
        apiKey: currentSettings.apiKey,
        modelName: currentSettings.modelName,
        timeoutMs: currentSettings.timeoutMs,
        maxTokens: mode === "fast" ? 850 : 1500,
        useResponseFormat: currentSettings.useResponseFormat,
        debug: currentSettings.enableDebugLogs
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || "The model returned an empty response.");
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
        setStatus("Analysis complete. Floating panel updated.");
      } catch {
        setStatus("Analysis complete. The current page cannot inject the floating panel, so use the popup result.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
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
    setStatus("Analysis copied.");
  }

  return (
    <main className="popup-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Street View Trainer</span>
          <h1>Geo AI Assistant</h1>
          <p>Analyze the visible view and keep review notes locally.</p>
        </div>
        <button className="icon-button" type="button" onClick={openOptions} title="Open options">
          <ExternalLink size={17} />
        </button>
      </header>

      <section className="toolbar">
        <div className="mode-toggle" role="group" aria-label="Analysis mode">
          <button className={mode === "fast" ? "active" : ""} type="button" onClick={() => setMode("fast")}>
            Fast
          </button>
          <button className={mode === "detailed" ? "active" : ""} type="button" onClick={() => setMode("detailed")}>
            Detailed
          </button>
        </div>
        <button className="primary-button" type="button" disabled={loading} onClick={analyzeCurrentView}>
          {loading ? <Loader2 size={17} /> : <Compass size={17} />}
          {loading ? "Analyzing..." : "Analyze visible street view"}
        </button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {status ? <p className="status-line">{status}</p> : null}

      <PredictionCard result={lastAnalysis?.result ?? null} onCopy={lastAnalysis ? copyResult : undefined} />

      <div className="popup-footer">
        <button className="secondary-button" type="button" disabled={!lastAnalysis} onClick={() => setShowFeedback(true)}>
          Review round
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!lastAnalysis}
          onClick={() =>
            lastAnalysis &&
            showFloatingPanel(lastAnalysis.result).catch(() => {
              setError("The current page does not allow floating-panel injection.");
            })
          }
        >
          Show panel
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

function normalizeAnalysisResult(result: LastAnalysis["result"]): LastAnalysis["result"] {
  return {
    top_predictions: Array.isArray(result.top_predictions) ? result.top_predictions.slice(0, 3) : [],
    estimated_location: result.estimated_location ?? { lat: null, lng: null, radius_km: 500 },
    clues: Array.isArray(result.clues) ? result.clues : [],
    fast_answer: result.fast_answer || result.top_predictions?.[0]?.country || "Unknown",
    detailed_reasoning: result.detailed_reasoning || "",
    next_observation_suggestions: Array.isArray(result.next_observation_suggestions)
      ? result.next_observation_suggestions
      : [],
    uncertainties: Array.isArray(result.uncertainties) ? result.uncertainties : []
  };
}
