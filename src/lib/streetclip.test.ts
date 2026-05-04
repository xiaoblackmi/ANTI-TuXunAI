import { describe, expect, it } from "vitest";
import { streetClipScoresToAnalysis } from "./streetclip";

describe("streetClipScoresToAnalysis", () => {
  it("maps StreetCLIP scores into a displayable analysis result", () => {
    const result = streetClipScoresToAnalysis([
      { label: "France", score: 0.82 },
      { label: "Germany", score: 0.11 },
      { label: "Belgium", score: 0.07 }
    ]);

    expect(result.top_predictions[0].country).toBe("France");
    expect(result.top_predictions[0].confidence).toBeCloseTo(0.82, 2);
    expect(result.fast_answer).toContain("France");
    expect(result.clues[0].type).toBe("camera_meta");
  });
});
