import Dexie, { Table } from "dexie";
import type { AppSettings, GameCase, LearnedRule } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  apiBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  apiKey: "",
  modelName: "qwen3-vl-flash",
  streetClipApiBaseUrl: "https://api-inference.huggingface.co/models/geolocal/StreetCLIP",
  streetClipApiKey: "",
  streetClipModelName: "geolocal/StreetCLIP",
  timeoutMs: 5000,
  imageQuality: 0.72,
  useResponseFormat: true,
  enableHistoryRetrieval: true,
  enableDebugLogs: false
};

class GeoAssistantDb extends Dexie {
  cases!: Table<GameCase, string>;
  learnedRules!: Table<LearnedRule, string>;
  settings!: Table<AppSettings, "app">;

  constructor() {
    super("GeoGuessrAiAssistant");
    this.version(1).stores({
      cases: "id, createdAt, screenshotHash, correctCountry, modelName, isUseful",
      learnedRules: "id, createdAt, country, region, *tags, confidence",
      settings: "id"
    });
  }
}

export const db = new GeoAssistantDb();

export async function getSettings(): Promise<AppSettings> {
  const saved = await db.settings.get("app");
  return { ...DEFAULT_SETTINGS, ...saved, id: "app" };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, id: "app" });
}

export async function clearAllLocalData(): Promise<void> {
  await db.transaction("rw", db.cases, db.learnedRules, db.settings, async () => {
    await db.cases.clear();
    await db.learnedRules.clear();
    await db.settings.clear();
  });
}

export async function saveGameCase(gameCase: GameCase): Promise<void> {
  await db.cases.put(gameCase);
}

export async function getRecentGameCases(limit = 20): Promise<GameCase[]> {
  return db.cases.orderBy("createdAt").reverse().limit(limit).toArray();
}

export async function getAllGameCases(limit = 200): Promise<GameCase[]> {
  return db.cases.orderBy("createdAt").reverse().limit(limit).toArray();
}

export async function updateGameCaseUsefulness(id: string, isUseful: boolean): Promise<void> {
  await db.cases.update(id, { isUseful });
}

export async function deleteGameCase(id: string): Promise<void> {
  await db.cases.delete(id);
}

export async function saveLearnedRules(rules: LearnedRule[]): Promise<void> {
  if (rules.length === 0) return;
  await db.learnedRules.bulkPut(rules);
}

export async function getRecentLearnedRules(limit = 8): Promise<LearnedRule[]> {
  return db.learnedRules.orderBy("createdAt").reverse().limit(limit).toArray();
}

export async function getAllLearnedRules(limit = 50): Promise<LearnedRule[]> {
  return db.learnedRules.orderBy("createdAt").reverse().limit(limit).toArray();
}

export async function saveLearnedRule(rule: LearnedRule): Promise<void> {
  await db.learnedRules.put(rule);
}

export async function deleteLearnedRule(id: string): Promise<void> {
  await db.learnedRules.delete(id);
}

export interface LocalBackup {
  schemaVersion: 1;
  exportedAt: string;
  settings: AppSettings;
  cases: GameCase[];
  learnedRules: LearnedRule[];
}

export async function createLocalBackup(): Promise<LocalBackup> {
  const [settings, cases, learnedRules] = await Promise.all([getSettings(), getAllGameCases(), getAllLearnedRules(500)]);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    cases,
    learnedRules
  };
}

export async function restoreLocalBackup(backup: LocalBackup): Promise<void> {
  await db.transaction("rw", db.cases, db.learnedRules, db.settings, async () => {
    await db.settings.put({ ...backup.settings, id: "app" });
    if (backup.cases.length) await db.cases.bulkPut(backup.cases);
    if (backup.learnedRules.length) await db.learnedRules.bulkPut(backup.learnedRules);
  });
}
