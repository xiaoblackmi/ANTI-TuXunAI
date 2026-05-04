import { db, getRecentLearnedRules } from "./storage";
import type { LearnedRule } from "./types";

export interface RuleRetrievalQuery {
  countries?: string[];
  tags?: string[];
  keywords?: string[];
}

export async function retrieveRelevantRules(
  query: RuleRetrievalQuery,
  limit = 8
): Promise<LearnedRule[]> {
  const rules = await db.learnedRules.orderBy("createdAt").reverse().limit(200).toArray();
  if (rules.length === 0) return [];

  const normalizedCountries = normalizeList(query.countries);
  const normalizedTags = normalizeList(query.tags);
  const normalizedKeywords = normalizeList(query.keywords);

  const scored = rules
    .map((rule) => ({ rule, score: scoreRule(rule, normalizedCountries, normalizedTags, normalizedKeywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.rule.createdAt.localeCompare(a.rule.createdAt));

  if (scored.length === 0) {
    return getRecentLearnedRules(limit);
  }

  return scored.slice(0, limit).map((item) => item.rule);
}

export async function embeddingSearch(): Promise<LearnedRule[]> {
  return [];
}

function scoreRule(rule: LearnedRule, countries: string[], tags: string[], keywords: string[]): number {
  const haystack = normalizeText(
    [rule.title, rule.ruleText, rule.country, rule.region, ...rule.tags].filter(Boolean).join(" ")
  );
  let score = 0;

  for (const country of countries) {
    if (country && haystack.includes(country)) score += 4;
  }
  for (const tag of tags) {
    if (tag && haystack.includes(tag)) score += 3;
  }
  for (const keyword of keywords) {
    if (keyword && haystack.includes(keyword)) score += 1;
  }

  score += Math.min(2, Math.max(0, rule.confidence));
  return score;
}

function normalizeList(values: string[] | undefined): string[] {
  return (values ?? []).map(normalizeText).filter(Boolean);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}
