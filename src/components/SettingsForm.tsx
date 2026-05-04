import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AppSettings } from "../lib/types";

interface SettingsFormProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onSave: () => void;
  onTestApi: () => void;
  onClearData: () => void;
  saving: boolean;
  testing: boolean;
  status: string;
}

export function SettingsForm({
  settings,
  onChange,
  onSave,
  onTestApi,
  onClearData,
  saving,
  testing,
  status
}: SettingsFormProps) {
  const [showKey, setShowKey] = useState(false);
  const [showStreetClipKey, setShowStreetClipKey] = useState(false);

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
        <h2>Qwen 精准模式</h2>
        <p className="muted-text">精准模式继续使用 OpenAI-compatible Vision API。</p>
        <div className="preset-grid" aria-label="API 预设">
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
            Qwen 新加坡
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
            Qwen 北京
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
            Qwen 美国
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
          模型名称
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
          请求严格 JSON response_format
        </label>
      </section>

      <section className="settings-section">
        <h2>StreetCLIP 快速模式</h2>
        <p className="muted-text">快速模式使用 Hugging Face 的 StreetCLIP 推理接口，只做国家候选粗筛，不调用 Qwen。</p>
        <label>
          Hugging Face Inference URL
          <input value={settings.streetClipApiBaseUrl} onChange={(event) => update("streetClipApiBaseUrl", event.target.value)} />
        </label>
        <label>
          Hugging Face Token
          <div className="secret-field">
            <input
              type={showStreetClipKey ? "text" : "password"}
              value={settings.streetClipApiKey}
              onChange={(event) => update("streetClipApiKey", event.target.value)}
              placeholder="hf_..."
            />
            <button type="button" className="icon-button" onClick={() => setShowStreetClipKey((value) => !value)}>
              {showStreetClipKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <label>
          StreetCLIP 模型名
          <input
            value={settings.streetClipModelName}
            onChange={(event) => update("streetClipModelName", event.target.value)}
            placeholder="geolocal/StreetCLIP"
          />
        </label>
      </section>

      <section className="settings-section">
        <h2>请求与图片</h2>
        <label>
          请求超时时间（毫秒）
          <input
            type="number"
            min={2000}
            step={500}
            value={settings.timeoutMs}
            onChange={(event) => update("timeoutMs", Number(event.target.value))}
          />
        </label>
        <label>
          图片压缩质量：{settings.imageQuality.toFixed(2)}
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
        <h2>本地学习</h2>
        <label className="check-line">
          <input
            type="checkbox"
            checked={settings.enableHistoryRetrieval}
            onChange={(event) => update("enableHistoryRetrieval", event.target.checked)}
          />
          启用历史经验检索（仅精准模式使用）
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={settings.enableDebugLogs}
            onChange={(event) => update("enableDebugLogs", event.target.checked)}
          />
          启用调试日志
        </label>
      </section>

      <div className="settings-actions">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "保存中..." : "保存设置"}
        </button>
        <button className="secondary-button" type="button" onClick={onTestApi} disabled={testing || saving}>
          {testing ? "测试中..." : "测试 Qwen API"}
        </button>
        <button className="danger-button" type="button" onClick={onClearData}>
          <Trash2 size={16} />
          清空本地数据
        </button>
      </div>
      {status ? <p className="status-text">{status}</p> : null}
    </form>
  );
}
