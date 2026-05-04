import { ChevronRight, Copy, Minimize2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PredictionCard } from "../components/PredictionCard";
import type { AnalysisResult } from "../lib/types";

interface FloatingPanelProps {
  result: AnalysisResult;
  onClose: () => void;
}

export function FloatingPanel({ result, onClose }: FloatingPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const copyText = useMemo(() => JSON.stringify(result, null, 2), [result]);

  async function handleCopy() {
    await navigator.clipboard.writeText(copyText);
  }

  return (
    <aside className={collapsed ? "geo-panel collapsed" : "geo-panel"}>
      <div className="geo-panel-bar">
        <span className="geo-panel-title">Geo AI Assistant</span>
        <div className="geo-panel-actions">
          <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "展开" : "折叠"}>
            {collapsed ? <ChevronRight size={15} /> : <Minimize2 size={15} />}
          </button>
          <button type="button" onClick={handleCopy} title="复制分析结果">
            <Copy size={15} />
          </button>
          <button type="button" onClick={onClose} title="关闭">
            <X size={15} />
          </button>
        </div>
      </div>
      {!collapsed ? (
        <div className="geo-panel-body">
          <PredictionCard result={result} compact onCopy={handleCopy} />
        </div>
      ) : null}
    </aside>
  );
}
