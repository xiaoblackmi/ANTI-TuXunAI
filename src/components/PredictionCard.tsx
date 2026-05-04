import { Copy, MapPin, Route, Target } from "lucide-react";
import type { AnalysisResult } from "../lib/types";

interface PredictionCardProps {
  result: AnalysisResult | null;
  compact?: boolean;
  onCopy?: () => void;
}

export function PredictionCard({ result, compact = false, onCopy }: PredictionCardProps) {
  if (!result) {
    return (
      <section className="empty-state">
        <Target size={22} />
        <p>还没有分析结果。</p>
      </section>
    );
  }

  const location = result.estimated_location;

  return (
    <section className={compact ? "prediction-card compact" : "prediction-card"}>
      <div className="card-head">
        <div>
          <span className="eyebrow">AI 判断</span>
          <h2>{result.fast_answer || result.top_predictions[0]?.country || "未知"}</h2>
        </div>
        {onCopy ? (
          <button className="icon-button" type="button" onClick={onCopy} title="复制分析结果">
            <Copy size={16} />
          </button>
        ) : null}
      </div>

      <div className="prediction-list">
        {result.top_predictions.slice(0, 3).map((prediction, index) => (
          <div className="prediction-row" key={`${prediction.country}-${index}`}>
            <span className="rank">{index + 1}</span>
            <div>
              <strong>{prediction.country}</strong>
              {prediction.region ? <span>{prediction.region}</span> : null}
              <p>{prediction.reason}</p>
            </div>
            <b>{Math.round(prediction.confidence * 100)}%</b>
          </div>
        ))}
      </div>

      <div className="location-line">
        <MapPin size={16} />
        <span>
          {location?.lat != null && location?.lng != null
            ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
            : "坐标不确定"}
          {location?.radius_km ? ` · 半径约 ${location.radius_km} km` : ""}
        </span>
      </div>

      <div className="clue-list">
        {result.clues.slice(0, compact ? 4 : 8).map((clue, index) => (
          <article className="clue" key={`${clue.type}-${index}`}>
            <span>{clue.type}</span>
            <p>{clue.observation}</p>
            <small>{clue.interpretation}</small>
          </article>
        ))}
      </div>

      {result.next_observation_suggestions.length ? (
        <div className="suggestions">
          <Route size={16} />
          <div>
            {result.next_observation_suggestions.slice(0, 3).map((suggestion) => (
              <p key={suggestion}>{suggestion}</p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
