import type { AnalysisResult, ClueType, GeoClue, TopPrediction } from "./types";

const CLUE_TYPES: ClueType[] = [
  "road_marking",
  "sign",
  "language",
  "vegetation",
  "architecture",
  "utility_pole",
  "license_plate",
  "climate",
  "camera_meta",
  "other"
];

export function normalizeAnalysisResult(input: Partial<AnalysisResult> | null | undefined): AnalysisResult {
  const predictions = Array.isArray(input?.top_predictions)
    ? input.top_predictions.map(normalizePrediction).filter(isPresent).slice(0, 3)
    : [];

  return {
    top_predictions: predictions,
    estimated_location: {
      lat: normalizeNullableNumber(input?.estimated_location?.lat),
      lng: normalizeNullableNumber(input?.estimated_location?.lng),
      radius_km: normalizeRadius(input?.estimated_location?.radius_km)
    },
    clues: Array.isArray(input?.clues) ? input.clues.map(normalizeClue).filter(isPresent).slice(0, 10) : [],
    fast_answer: normalizeString(input?.fast_answer) || predictions[0]?.country || "Unknown",
    detailed_reasoning: normalizeString(input?.detailed_reasoning),
    next_observation_suggestions: normalizeStringArray(input?.next_observation_suggestions, 5),
    uncertainties: normalizeStringArray(input?.uncertainties, 5)
  };
}

function normalizePrediction(value: unknown): TopPrediction | null {
  if (!isRecord(value)) return null;
  const country = normalizeString(value.country);
  if (!country) return null;
  return {
    country,
    region: normalizeString(value.region),
    confidence: normalizeConfidence(value.confidence),
    reason: normalizeString(value.reason)
  };
}

function normalizeClue(value: unknown): GeoClue | null {
  if (!isRecord(value)) return null;
  return {
    type: normalizeClueType(value.type),
    observation: normalizeString(value.observation),
    interpretation: normalizeString(value.interpretation),
    confidence: normalizeConfidence(value.confidence)
  };
}

function normalizeClueType(value: unknown): ClueType {
  return typeof value === "string" && CLUE_TYPES.includes(value as ClueType) ? (value as ClueType) : "other";
}

function normalizeConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function normalizeRadius(value: unknown): number {
  const radius = typeof value === "number" && Number.isFinite(value) ? value : 500;
  return Math.min(20000, Math.max(1, Math.round(radius)));
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown, limit: number): string[] {
  return Array.isArray(value) ? value.map(normalizeString).filter(Boolean).slice(0, limit) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
