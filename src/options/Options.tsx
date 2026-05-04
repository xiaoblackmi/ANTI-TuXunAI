import { useEffect, useState } from "react";
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
      setStatus("设置已保存。");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearData() {
    const confirmed = window.confirm("确认清空所有本地设置、案例和学习规则？此操作不可恢复。");
    if (!confirmed) return;
    await clearAllLocalData();
    setSettings(DEFAULT_SETTINGS);
    setStatus("本地数据已清空。");
  }

  return (
    <main className="options-shell">
      <div className="options-main">
        <header className="app-header">
          <div>
            <span className="eyebrow">Local Settings</span>
            <h1>Geo AI Assistant Options</h1>
            <p>API Key 只保存在浏览器本地。插件不会读取游戏后台数据或隐藏坐标。</p>
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
      </div>
    </main>
  );
}
