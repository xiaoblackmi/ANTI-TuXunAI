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
      setStatus("设置已保存。");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearData() {
    const confirmed = window.confirm("确定清空所有本地设置、案例和学习规则吗？此操作不可撤销。");
    if (!confirmed) return;
    await clearAllLocalData();
    setSettings(DEFAULT_SETTINGS);
    setStatus("本地数据已清空。");
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
        throw new Error(response.error || "API 测试没有返回预期 JSON。");
      }

      setStatus("API 测试成功。");
    } catch (error) {
      setStatus(error instanceof Error ? `API 测试失败：${error.message}` : "API 测试失败。");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="options-shell">
      <div className="options-main">
        <header className="app-header">
          <div>
            <span className="eyebrow">本地设置</span>
            <h1>图寻 AI 助手设置</h1>
            <p>API Key 只保存在浏览器本地。插件不会读取隐藏答案、坐标或游戏平台内部数据。</p>
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
