import { Download, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import {
  createLocalBackup,
  deleteGameCase,
  deleteLearnedRule,
  getAllLearnedRules,
  getRecentGameCases,
  restoreLocalBackup,
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

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

  function exportRules() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), learnedRules: rules }, null, 2);
    downloadText(payload, `geo-ai-learned-rules-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus(`Exported ${rules.length} rule(s).`);
  }

  async function importRules(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const importedRules = normalizeImportedRules(parsed);
      for (const rule of importedRules) {
        await saveLearnedRule(rule);
      }
      setStatus(`Imported ${importedRules.length} rule(s).`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? `Import failed: ${error.message}` : "Import failed.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function exportBackup() {
    const backup = await createLocalBackup();
    downloadJson(backup, `geo-ai-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus(`Exported backup with ${backup.cases.length} case(s) and ${backup.learnedRules.length} rule(s).`);
  }

  async function restoreBackup(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const backup = normalizeBackup(parsed);
      await restoreLocalBackup(backup);
      setStatus(`Restored ${backup.cases.length} case(s) and ${backup.learnedRules.length} rule(s).`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? `Restore failed: ${error.message}` : "Restore failed.");
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
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

      <div className="library-actions">
        <button className="secondary-button" type="button" onClick={exportRules} disabled={rules.length === 0}>
          <Download size={16} />
          Export rules
        </button>
        <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}>
          <Upload size={16} />
          Import rules
        </button>
        <button className="secondary-button" type="button" onClick={() => void exportBackup()}>
          <Download size={16} />
          Export backup
        </button>
        <button className="secondary-button" type="button" onClick={() => restoreInputRef.current?.click()}>
          <Upload size={16} />
          Restore backup
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => void importRules(event.target.files?.[0])}
        />
        <input
          ref={restoreInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => void restoreBackup(event.target.files?.[0])}
        />
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

function normalizeImportedRules(input: unknown, options: { allowEmpty?: boolean } = {}): LearnedRule[] {
  const rawRules = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.learnedRules)
      ? input.learnedRules
      : [];

  const rules = rawRules.flatMap((value): LearnedRule[] => {
    if (!isRecord(value) || typeof value.ruleText !== "string") return [];
    const now = new Date().toISOString();
    return [
      {
        id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
        createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
        title: typeof value.title === "string" && value.title.trim() ? value.title : "Imported rule",
        ruleText: value.ruleText,
        country: typeof value.country === "string" ? value.country : undefined,
        region: typeof value.region === "string" ? value.region : undefined,
        tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string") : [],
        confidence: typeof value.confidence === "number" ? Math.min(1, Math.max(0, value.confidence)) : 0.6,
        sourceCaseIds: Array.isArray(value.sourceCaseIds)
          ? value.sourceCaseIds.filter((id): id is string => typeof id === "string")
          : []
      }
    ];
  });

  if (rules.length === 0 && !options.allowEmpty) {
    throw new Error("No valid learned rules found.");
  }

  return rules;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function downloadJson(value: unknown, filename: string) {
  downloadText(JSON.stringify(value, null, 2), filename);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeBackup(input: unknown) {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    throw new Error("Unsupported backup format.");
  }
  if (!isRecord(input.settings)) {
    throw new Error("Backup is missing settings.");
  }
  return {
    schemaVersion: 1 as const,
    exportedAt: typeof input.exportedAt === "string" ? input.exportedAt : new Date().toISOString(),
    settings: {
      id: "app" as const,
      apiBaseUrl: typeof input.settings.apiBaseUrl === "string" ? input.settings.apiBaseUrl : "",
      apiKey: typeof input.settings.apiKey === "string" ? input.settings.apiKey : "",
      modelName: typeof input.settings.modelName === "string" ? input.settings.modelName : "qwen3-vl-flash",
      timeoutMs: typeof input.settings.timeoutMs === "number" ? input.settings.timeoutMs : 5000,
      imageQuality: typeof input.settings.imageQuality === "number" ? input.settings.imageQuality : 0.82,
      useResponseFormat: input.settings.useResponseFormat !== false,
      enableHistoryRetrieval: input.settings.enableHistoryRetrieval !== false,
      enableDebugLogs: input.settings.enableDebugLogs === true
    },
    cases: Array.isArray(input.cases) ? input.cases.filter(isGameCaseLike) : [],
    learnedRules: Array.isArray(input.learnedRules) ? normalizeImportedRules(input.learnedRules, { allowEmpty: true }) : []
  };
}

function isGameCaseLike(value: unknown): value is GameCase {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.screenshotHash === "string" &&
    typeof value.correctCountry === "string" &&
    Array.isArray(value.tags) &&
    typeof value.modelName === "string" &&
    typeof value.isUseful === "boolean"
  );
}
