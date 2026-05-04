import { describe, expect, it } from "vitest";
import { normalizeAnalysisResult } from "./analysisResult";

describe("normalizeAnalysisResult", () => {
  it("clamps predictions and confidence values", () => {
    const normalized = normalizeAnalysisResult({
      top_predictions: [
        { country: "Japan", region: "", confidence: 2, reason: "Visible road signs." },
        { country: "South Korea", region: "", confidence: -1, reason: "Urban cues." },
        { country: "Taiwan", region: "", confidence: 0.3, reason: "Road markings." },
        { country: "Thailand", region: "", confidence: 0.2, reason: "Extra candidate." }
      ]
    });

    expect(normalized.top_predictions).toHaveLength(3);
    expect(normalized.top_predictions[0].confidence).toBe(1);
    expect(normalized.top_predictions[1].confidence).toBe(0);
  });

  it("falls back to safe defaults", () => {
    const normalized = normalizeAnalysisResult(null);
    expect(normalized.fast_answer).toBe("未知");
    expect(normalized.estimated_location.radius_km).toBe(500);
    expect(normalized.top_predictions).toEqual([]);
  });
});
