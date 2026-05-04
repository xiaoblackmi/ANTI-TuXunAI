export type AnalysisMode = "fast" | "detailed";

export type ClueType =
  | "road_marking"
  | "sign"
  | "language"
  | "vegetation"
  | "architecture"
  | "utility_pole"
  | "license_plate"
  | "climate"
  | "camera_meta"
  | "other";

export interface TopPrediction {
  country: string;
  region: string;
  confidence: number;
  reason: string;
}

export interface EstimatedLocation {
  lat: number | null;
  lng: number | null;
  radius_km: number;
}

export interface GeoClue {
  type: ClueType;
  observation: string;
  interpretation: string;
  confidence: number;
}

export interface AnalysisResult {
  top_predictions: TopPrediction[];
  estimated_location: EstimatedLocation;
  clues: GeoClue[];
  fast_answer: string;
  detailed_reasoning: string;
  next_observation_suggestions: string[];
  uncertainties: string[];
}

export interface AppSettings {
  id: "app";
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  timeoutMs: number;
  imageQuality: number;
  useResponseFormat: boolean;
  enableHistoryRetrieval: boolean;
  enableDebugLogs: boolean;
}

export interface GameCase {
  id: string;
  createdAt: string;
  screenshotHash: string;
  screenshotThumbnail: string | null;
  aiPrediction: AnalysisResult | null;
  correctCountry: string;
  correctRegion?: string;
  correctLat?: number | null;
  correctLng?: number | null;
  userCorrectionText: string;
  tags: string[];
  modelName: string;
  isUseful: boolean;
}

export interface LearnedRule {
  id: string;
  createdAt: string;
  title: string;
  ruleText: string;
  country?: string;
  region?: string;
  tags: string[];
  confidence: number;
  sourceCaseIds: string[];
}

export interface LastAnalysis {
  createdAt: string;
  mode: AnalysisMode;
  screenshotHash: string;
  modelName: string;
  result: AnalysisResult;
}

export interface VisionCallOptions {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  timeoutMs: number;
  maxTokens?: number;
  useResponseFormat?: boolean;
  debug?: boolean;
}

export interface ModelJsonResponse<T> {
  ok: boolean;
  data: T | null;
  rawText: string;
  error?: string;
}

export interface FeedbackLearningResponse {
  rules: Array<{
    title: string;
    ruleText: string;
    country?: string;
    region?: string;
    tags?: string[];
    confidence?: number;
  }>;
}

export const FEEDBACK_TAGS = [
  "路牌",
  "车道线",
  "语言",
  "植被",
  "建筑",
  "电线杆",
  "车牌",
  "护栏",
  "路面",
  "天气/气候",
  "其他"
] as const;
