import { describe, expect, it } from "vitest";
import { rankLearnedRules } from "./caseRetrieval";
import type { LearnedRule } from "./types";

describe("rankLearnedRules", () => {
  it("prioritizes country and tag matches", () => {
    const rules: LearnedRule[] = [
      makeRule("1", "South Africa lines", "Yellow shoulder lines and dry vegetation.", "South Africa", ["road_marking"], 0.7),
      makeRule("2", "Nordic signs", "Blue signs and boreal forest.", "Finland", ["sign"], 0.9)
    ];

    const ranked = rankLearnedRules(rules, {
      countries: ["south africa"],
      tags: ["road_marking"],
      keywords: ["yellow"]
    });

    expect(ranked[0].rule.id).toBe("1");
    expect(ranked[0].score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });
});

function makeRule(
  id: string,
  title: string,
  ruleText: string,
  country: string,
  tags: string[],
  confidence: number
): LearnedRule {
  return {
    id,
    createdAt: `2026-05-04T00:00:0${id}.000Z`,
    title,
    ruleText,
    country,
    region: "",
    tags,
    confidence,
    sourceCaseIds: []
  };
}
