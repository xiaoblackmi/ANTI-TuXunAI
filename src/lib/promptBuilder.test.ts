import { describe, expect, it } from "vitest";
import { buildFastGeoPrompt } from "./promptBuilder";
import type { LearnedRule } from "./types";

describe("buildFastGeoPrompt", () => {
  it("includes learned rules as hints", () => {
    const rule: LearnedRule = {
      id: "rule-1",
      createdAt: "2026-05-04T00:00:00.000Z",
      title: "Baltic poles",
      ruleText: "Concrete utility poles can help separate Baltic rural roads.",
      country: "Estonia",
      region: "",
      tags: ["utility_pole"],
      confidence: 0.8,
      sourceCaseIds: ["case-1"]
    };

    const prompt = buildFastGeoPrompt([rule]);
    expect(prompt).toContain("Baltic poles");
    expect(prompt).toContain("只能参考，不能盲从");
    expect(prompt).toContain("只返回严格 JSON");
    expect(prompt).toContain("不要延续上一张图");
  });
});
