import { useEffect, useState } from "react";
import { callTextModelForJson } from "../lib/apiClient";
import { LocalDataPanel } from "../components/LocalDataPanel";
import { SettingsForm } from "../components/SettingsForm";
import { clearAllLocalData, DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/storage";
import type { AppSettings } from "../lib/types";

export function Options() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function handleSave() {
    setSaving(true);
    setStatus("");
    try {
      const sanitized = sanitizeSettings(settings);
      await saveSettings(sanitized);
      setSettings(sanitized);
      setStatus("Settings saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearData() {
    const confirmed = window.confirm("Clear all local settings, cases, and learned rules? This cannot be undone.");
    if (!confirmed) return;
    await clearAllLocalData();
    setSettings(DEFAULT_SETTINGS);
    setStatus("Local data cleared.");
  }

  async function handleTestApi() {
    setTesting(true);
    setStatus("");
    try {
      const sanitized = sanitizeSettings(settings);
      await saveSettings(sanitized);
      setSettings(sanitized);

      const response = await callTextModelForJson<{ ok: boolean; provider: string }>(
        'Return exactly this JSON: {"ok":true,"provider":"configured"}',
        {
          apiBaseUrl: sanitized.apiBaseUrl,
          apiKey: sanitized.apiKey,
          modelName: sanitized.modelName,
          timeoutMs: Math.max(5000, sanitized.timeoutMs),
          maxTokens: 80,
          useResponseFormat: sanitized.useResponseFormat,
          debug: sanitized.enableDebugLogs
        }
      );

      if (!response.ok || !response.data?.ok) {
        throw new Error(response.error || "API test did not return the expected JSON.");
      }

      setStatus("API test succeeded.");
    } catch (error) {
      setStatus(error instanceof Error ? `API test failed: ${error.message}` : "API test failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="options-shell">
      <div className="options-main">
        <header className="app-header">
          <div>
            <span className="eyebrow">Local Settings</span>
            <h1>Geo AI Assistant Options</h1>
            <p>API keys stay in browser storage. The extension does not read hidden game data or coordinates.</p>
          </div>
        </header>
        <SettingsForm
          settings={settings}
          onChange={setSettings}
          onSave={handleSave}
          onTestApi={handleTestApi}
          onClearData={handleClearData}
          saving={saving}
          testing={testing}
          status={status}
        />
        <LocalDataPanel />
      </div>
    </main>
  );
}

function sanitizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    apiBaseUrl: settings.apiBaseUrl.trim().replace(/\/+$/, ""),
    timeoutMs: Math.max(2000, settings.timeoutMs),
    imageQuality: Math.min(0.95, Math.max(0.35, settings.imageQuality))
  };
}
