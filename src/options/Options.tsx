import { useEffect, useState } from "react";
import { LocalDataPanel } from "../components/LocalDataPanel";
import { SettingsForm } from "../components/SettingsForm";
import { clearAllLocalData, DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/storage";
import type { AppSettings } from "../lib/types";

export function Options() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function handleSave() {
    setSaving(true);
    setStatus("");
    try {
      await saveSettings({
        ...settings,
        apiBaseUrl: settings.apiBaseUrl.trim().replace(/\/+$/, ""),
        timeoutMs: Math.max(2000, settings.timeoutMs),
        imageQuality: Math.min(0.95, Math.max(0.35, settings.imageQuality))
      });
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
          onClearData={handleClearData}
          saving={saving}
          status={status}
        />
        <LocalDataPanel />
      </div>
    </main>
  );
}
