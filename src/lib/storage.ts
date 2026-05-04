import Dexie, { Table } from "dexie";
import type { AppSettings, GameCase, LearnedRule } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  apiBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  apiKey: "",
  modelName: "qwen3-vl-flash",
  timeoutMs: 5000,
  imageQuality: 0.82,
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

export async function saveLearnedRules(rules: LearnedRule[]): Promise<void> {
  if (rules.length === 0) return;
  await db.learnedRules.bulkPut(rules);
}

export async function getRecentLearnedRules(limit = 8): Promise<LearnedRule[]> {
  return db.learnedRules.orderBy("createdAt").reverse().limit(limit).toArray();
}
