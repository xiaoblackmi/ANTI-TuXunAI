import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AppSettings } from "../lib/types";

interface SettingsFormProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onSave: () => void;
  onClearData: () => void;
  saving: boolean;
  status: string;
}

export function SettingsForm({ settings, onChange, onSave, onClearData, saving, status }: SettingsFormProps) {
  const [showKey, setShowKey] = useState(false);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <section className="settings-section">
        <h2>API</h2>
        <div className="preset-grid" aria-label="API presets">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onChange({
                ...settings,
                apiBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
                modelName: "qwen3-vl-flash",
                useResponseFormat: true
              })
            }
          >
            Qwen Singapore
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onChange({
                ...settings,
                apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
                modelName: "qwen3-vl-flash",
                useResponseFormat: true
              })
            }
          >
            Qwen Beijing
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onChange({
                ...settings,
                apiBaseUrl: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
                modelName: "qwen3-vl-flash-us",
                useResponseFormat: true
              })
            }
          >
            Qwen US
          </button>
        </div>
        <label>
          API Base URL
          <input
            value={settings.apiBaseUrl}
            onChange={(event) => update("apiBaseUrl", event.target.value)}
            placeholder="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
          />
        </label>
        <label>
          API Key
          <div className="secret-field">
            <input
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(event) => update("apiKey", event.target.value)}
              placeholder="sk-..."
            />
            <button type="button" className="icon-button" onClick={() => setShowKey((value) => !value)}>
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <label>
          Model Name
          <input
            value={settings.modelName}
            onChange={(event) => update("modelName", event.target.value)}
            placeholder="qwen3-vl-flash"
          />
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={settings.useResponseFormat}
            onChange={(event) => update("useResponseFormat", event.target.checked)}
          />
          Request strict JSON response_format
        </label>
      </section>

      <section className="settings-section">
        <h2>Request and Image</h2>
        <label>
          Request timeout in ms
          <input
            type="number"
            min={2000}
            step={500}
            value={settings.timeoutMs}
            onChange={(event) => update("timeoutMs", Number(event.target.value))}
          />
        </label>
        <label>
          Image quality: {settings.imageQuality.toFixed(2)}
          <input
            type="range"
            min={0.35}
            max={0.95}
            step={0.01}
            value={settings.imageQuality}
            onChange={(event) => update("imageQuality", Number(event.target.value))}
          />
        </label>
      </section>

      <section className="settings-section">
        <h2>Local Learning</h2>
        <label className="check-line">
          <input
            type="checkbox"
            checked={settings.enableHistoryRetrieval}
            onChange={(event) => update("enableHistoryRetrieval", event.target.checked)}
          />
          Enable learned-rule retrieval
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={settings.enableDebugLogs}
            onChange={(event) => update("enableDebugLogs", event.target.checked)}
          />
          Enable debug logs
        </label>
      </section>

      <div className="settings-actions">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
        <button className="danger-button" type="button" onClick={onClearData}>
          <Trash2 size={16} />
          Clear local data
        </button>
      </div>
      {status ? <p className="status-text">{status}</p> : null}
    </form>
  );
}
