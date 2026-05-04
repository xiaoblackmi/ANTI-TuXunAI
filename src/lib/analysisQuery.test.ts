import { describe, expect, it } from "vitest";
import { buildRuleQueryFromAnalysis } from "./analysisQuery";
import type { AnalysisResult } from "./types";

describe("buildRuleQueryFromAnalysis", () => {
  it("extracts countries, clue tags, and useful keywords", () => {
    const result: AnalysisResult = {
      top_predictions: [
        {
          country: "South Africa",
          region: "Western Cape",
          confidence: 0.7,
          reason: "Yellow shoulder markings and dry roadside vegetation."
        }
      ],
      estimated_location: { lat: null, lng: null, radius_km: 900 },
      clues: [
        {
          type: "road_marking",
          observation: "Yellow shoulder line",
          interpretation: "Common in southern Africa",
          confidence: 0.6
        }
      ],
      fast_answer: "Likely South Africa",
      detailed_reasoning: "Road markings and dry vegetation suggest a southern Africa candidate.",
      next_observation_suggestions: ["Look for road signs"],
      uncertainties: ["Could be neighboring countries"]
    };

    const query = buildRuleQueryFromAnalysis(result);
    expect(query.countries).toContain("South Africa");
    expect(query.tags).toContain("road_marking");
    expect(query.keywords).toContain("yellow");
    expect(query.keywords).toContain("vegetation");
  });
});
