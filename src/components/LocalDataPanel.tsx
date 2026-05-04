import { RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteGameCase,
  deleteLearnedRule,
  getAllLearnedRules,
  getRecentGameCases,
  saveLearnedRule,
  updateGameCaseUsefulness
} from "../lib/storage";
import type { GameCase, LearnedRule } from "../lib/types";

type Tab = "rules" | "cases";

export function LocalDataPanel() {
  const [tab, setTab] = useState<Tab>("rules");
  const [cases, setCases] = useState<GameCase[]>([]);
  const [rules, setRules] = useState<LearnedRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [draftRule, setDraftRule] = useState<LearnedRule | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const [nextCases, nextRules] = await Promise.all([getRecentGameCases(20), getAllLearnedRules(50)]);
    setCases(nextCases);
    setRules(nextRules);
  }

  async function removeRule(id: string) {
    await deleteLearnedRule(id);
    setStatus("Rule deleted.");
    await refresh();
  }

  async function removeCase(id: string) {
    await deleteGameCase(id);
    setStatus("Case deleted.");
    await refresh();
  }

  async function toggleUseful(gameCase: GameCase) {
    await updateGameCaseUsefulness(gameCase.id, !gameCase.isUseful);
    setStatus("Case updated.");
    await refresh();
  }

  async function saveDraftRule() {
    if (!draftRule) return;
    await saveLearnedRule({
      ...draftRule,
      tags: normalizeCsv(draftRule.tags.join(", ")),
      confidence: Math.min(1, Math.max(0, Number(draftRule.confidence) || 0))
    });
    setEditingRuleId(null);
    setDraftRule(null);
    setStatus("Rule saved.");
    await refresh();
  }

  function startEditingRule(rule: LearnedRule) {
    setEditingRuleId(rule.id);
    setDraftRule({ ...rule });
  }

  return (
    <section className="local-data-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Local Library</span>
          <h2>Cases and learned rules</h2>
        </div>
        <button className="icon-button" type="button" onClick={() => void refresh()} title="Refresh local data">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="mode-toggle data-tabs" role="group" aria-label="Local data view">
        <button type="button" className={tab === "rules" ? "active" : ""} onClick={() => setTab("rules")}>
          Rules ({rules.length})
        </button>
        <button type="button" className={tab === "cases" ? "active" : ""} onClick={() => setTab("cases")}>
          Cases ({cases.length})
        </button>
      </div>

      {status ? <p className="status-text">{status}</p> : null}

      {tab === "rules" ? (
        <div className="data-list">
          {rules.length === 0 ? <p className="muted-text">No learned rules yet.</p> : null}
          {rules.map((rule) => (
            <article className="data-item" key={rule.id}>
              {editingRuleId === rule.id && draftRule ? (
                <div className="rule-editor">
                  <label>
                    Title
                    <input value={draftRule.title} onChange={(event) => setDraftRule({ ...draftRule, title: event.target.value })} />
                  </label>
                  <label>
                    Rule
                    <textarea
                      rows={3}
                      value={draftRule.ruleText}
                      onChange={(event) => setDraftRule({ ...draftRule, ruleText: event.target.value })}
                    />
                  </label>
                  <div className="field-grid">
                    <label>
                      Country
                      <input
                        value={draftRule.country ?? ""}
                        onChange={(event) => setDraftRule({ ...draftRule, country: event.target.value })}
                      />
                    </label>
                    <label>
                      Region
                      <input
                        value={draftRule.region ?? ""}
                        onChange={(event) => setDraftRule({ ...draftRule, region: event.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    Tags
                    <input
                      value={draftRule.tags.join(", ")}
                      onChange={(event) => setDraftRule({ ...draftRule, tags: normalizeCsv(event.target.value) })}
                    />
                  </label>
                  <label>
                    Confidence
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={draftRule.confidence}
                      onChange={(event) => setDraftRule({ ...draftRule, confidence: Number(event.target.value) })}
                    />
                  </label>
                  <div className="item-actions">
                    <button className="primary-button" type="button" onClick={() => void saveDraftRule()}>
                      <Save size={16} />
                      Save
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setEditingRuleId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="item-main">
                    <h3>{rule.title}</h3>
                    <p>{rule.ruleText}</p>
                    <small>
                      {[rule.country, rule.region].filter(Boolean).join(" / ") || "No place"} | {rule.tags.join(", ") || "no tags"} |{" "}
                      {Math.round(rule.confidence * 100)}%
                    </small>
                  </div>
                  <div className="item-actions">
                    <button className="secondary-button" type="button" onClick={() => startEditingRule(rule)}>
                      Edit
                    </button>
                    <button className="icon-button danger-icon" type="button" onClick={() => void removeRule(rule.id)} title="Delete rule">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="data-list">
          {cases.length === 0 ? <p className="muted-text">No saved cases yet.</p> : null}
          {cases.map((gameCase) => (
            <article className="data-item" key={gameCase.id}>
              <div className="item-main">
                <h3>{gameCase.correctCountry}</h3>
                <p>{gameCase.userCorrectionText || "No correction note."}</p>
                <small>
                  {new Date(gameCase.createdAt).toLocaleString()} | {gameCase.tags.join(", ") || "no tags"} |{" "}
                  {gameCase.isUseful ? "useful" : "not useful"}
                </small>
              </div>
              <div className="item-actions">
                <button className="secondary-button" type="button" onClick={() => void toggleUseful(gameCase)}>
                  {gameCase.isUseful ? "Mark unused" : "Mark useful"}
                </button>
                <button className="icon-button danger-icon" type="button" onClick={() => void removeCase(gameCase.id)} title="Delete case">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function normalizeCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
