import type { AnalysisResult } from "./types";
import type { RuleRetrievalQuery } from "./caseRetrieval";

export function buildRuleQueryFromAnalysis(result: AnalysisResult | null | undefined): RuleRetrievalQuery {
  if (!result) return {};

  const countries = result.top_predictions.map((prediction) => prediction.country).filter(Boolean);
  const tags = result.clues.map((clue) => clue.type).filter(Boolean);
  const keywords = [
    result.fast_answer,
    result.detailed_reasoning,
    ...result.top_predictions.flatMap((prediction) => [prediction.region, prediction.reason]),
    ...result.clues.flatMap((clue) => [clue.observation, clue.interpretation]),
    ...result.next_observation_suggestions,
    ...result.uncertainties
  ]
    .flatMap(tokenize)
    .slice(0, 40);

  return {
    countries: unique(countries),
    tags: unique(tags),
    keywords: unique(keywords)
  };
}

function tokenize(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
