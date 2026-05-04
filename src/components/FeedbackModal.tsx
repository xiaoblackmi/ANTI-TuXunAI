import { useState } from "react";
import { callTextModelForJson } from "../lib/apiClient";
import { buildFeedbackLearningPrompt } from "../lib/promptBuilder";
import { getSettings, saveGameCase, saveLearnedRules } from "../lib/storage";
import type { FeedbackLearningResponse, GameCase, LastAnalysis, LearnedRule } from "../lib/types";
import { FEEDBACK_TAGS } from "../lib/types";

interface FeedbackModalProps {
  lastAnalysis: LastAnalysis | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function FeedbackModal({ lastAnalysis, onClose, onSaved }: FeedbackModalProps) {
  const [correctCountry, setCorrectCountry] = useState("");
  const [correctRegion, setCorrectRegion] = useState("");
  const [correctLat, setCorrectLat] = useState("");
  const [correctLng, setCorrectLng] = useState("");
  const [userCorrectionText, setUserCorrectionText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isUseful, setIsUseful] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!correctCountry.trim()) {
      setError("请填写正确国家/地区。");
      return;
    }
    if (!lastAnalysis) {
      setError("没有可复盘的最近分析。");
      return;
    }

    setSaving(true);
    setError("");

    const gameCase: GameCase = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      screenshotHash: lastAnalysis.screenshotHash,
      screenshotThumbnail: null,
      aiPrediction: lastAnalysis.result,
      correctCountry: correctCountry.trim(),
      correctRegion: correctRegion.trim() || undefined,
      correctLat: parseOptionalNumber(correctLat),
      correctLng: parseOptionalNumber(correctLng),
      userCorrectionText: userCorrectionText.trim(),
      tags,
      modelName: lastAnalysis.modelName,
      isUseful
    };

    try {
      await saveGameCase(gameCase);
      const settings = await getSettings();
      let learnedCount = 0;

      if (settings.apiKey.trim() && userCorrectionText.trim()) {
        const learning = await callTextModelForJson<FeedbackLearningResponse>(
          buildFeedbackLearningPrompt(gameCase),
          {
            apiBaseUrl: settings.apiBaseUrl,
            apiKey: settings.apiKey,
            modelName: settings.modelName,
            timeoutMs: Math.max(settings.timeoutMs, 8000),
            maxTokens: 700,
            useResponseFormat: settings.useResponseFormat,
            debug: settings.enableDebugLogs
          }
        );

        if (learning.ok && learning.data?.rules?.length) {
          const learnedRules: LearnedRule[] = learning.data.rules.slice(0, 3).map((rule) => ({
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            title: rule.title || "复盘经验",
            ruleText: rule.ruleText,
            country: rule.country || gameCase.correctCountry,
            region: rule.region || gameCase.correctRegion,
            tags: Array.isArray(rule.tags) ? rule.tags : tags,
            confidence: typeof rule.confidence === "number" ? rule.confidence : 0.7,
            sourceCaseIds: [gameCase.id]
          }));
          await saveLearnedRules(learnedRules);
          learnedCount = learnedRules.length;
        }
      }

      onSaved(learnedCount ? `已保存复盘，并学习 ${learnedCount} 条经验。` : "已保存复盘。");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存复盘失败。");
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="feedback-modal" onSubmit={handleSubmit}>
        <header>
          <div>
            <span className="eyebrow">复盘本局</span>
            <h2>保存纠错经验</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            关闭
          </button>
        </header>

        <label>
          AI 猜测国家
          <input value={lastAnalysis?.result.top_predictions[0]?.country ?? ""} readOnly />
        </label>
        <label>
          正确国家/地区
          <input value={correctCountry} onChange={(event) => setCorrectCountry(event.target.value)} placeholder="例如 Czechia" />
        </label>
        <label>
          正确城市/区域（可选）
          <input value={correctRegion} onChange={(event) => setCorrectRegion(event.target.value)} placeholder="例如 South Moravia" />
        </label>
        <div className="field-grid">
          <label>
            纬度（可选）
            <input value={correctLat} onChange={(event) => setCorrectLat(event.target.value)} inputMode="decimal" />
          </label>
          <label>
            经度（可选）
            <input value={correctLng} onChange={(event) => setCorrectLng(event.target.value)} inputMode="decimal" />
          </label>
        </div>
        <label>
          纠错说明
          <textarea
            value={userCorrectionText}
            onChange={(event) => setUserCorrectionText(event.target.value)}
            rows={4}
            placeholder="例如：这次错在把捷克路牌误判成斯洛伐克。"
          />
        </label>

        <div className="tag-grid">
          {FEEDBACK_TAGS.map((tag) => (
            <button
              type="button"
              className={tags.includes(tag) ? "tag selected" : "tag"}
              key={tag}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <label className="check-line">
          <input type="checkbox" checked={isUseful} onChange={(event) => setIsUseful(event.target.checked)} />
          标记为有用案例
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <footer>
          <button className="secondary-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存并学习"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
