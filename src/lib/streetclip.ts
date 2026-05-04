import type { AnalysisResult, ModelJsonResponse } from "./types";

export interface StreetClipScore {
  label: string;
  score: number;
}

export interface StreetClipOptions {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  timeoutMs: number;
  topK?: number;
  candidateLabels: readonly string[];
  hypothesisTemplate?: string;
  debug?: boolean;
}

export async function callStreetClipZeroShot(
  imageDataUrl: string,
  options: StreetClipOptions
): Promise<ModelJsonResponse<StreetClipScore[]>> {
  if (!options.apiKey.trim()) {
    return {
      ok: false,
      data: null,
      rawText: "",
      error: "请先在设置页填写 Hugging Face Token。"
    };
  }

  const endpoint = normalizeStreetClipEndpoint(options.apiBaseUrl, options.modelName);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs);
  const base64Image = extractBase64Image(imageDataUrl);

  try {
    const response = await postZeroShotRequest(endpoint, base64Image, options, controller.signal);
    const rawText = await response.text();
    if (!response.ok) {
      if (shouldRetryWithLegacyInference(endpoint, response.status, rawText)) {
        const legacyEndpoint = toLegacyInferenceEndpoint(endpoint, options.modelName);
        const fallbackResponse = await postZeroShotRequest(legacyEndpoint, base64Image, options, controller.signal);
        const fallbackText = await fallbackResponse.text();
        if (!fallbackResponse.ok) {
          return {
            ok: false,
            data: null,
            rawText: fallbackText,
            error: buildStreetClipError(fallbackResponse.status, fallbackResponse.statusText, fallbackText)
          };
        }

        const fallbackParsed = parseStreetClipScores(fallbackText);
        if (!fallbackParsed.ok) {
          return {
            ok: false,
            data: null,
            rawText: fallbackText,
            error: fallbackParsed.error
          };
        }

        return { ok: true, data: fallbackParsed.data, rawText: fallbackText };
      }

      return {
        ok: false,
        data: null,
        rawText,
        error: buildStreetClipError(response.status, response.statusText, rawText)
      };
    }

    const parsed = parseStreetClipScores(rawText);
    if (!parsed.ok) {
      return {
        ok: false,
        data: null,
        rawText,
        error: parsed.error
      };
    }

    return { ok: true, data: parsed.data, rawText };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "StreetCLIP 请求超时。"
        : error instanceof Error
          ? error.message
          : "StreetCLIP 请求失败。";
    return { ok: false, data: null, rawText: "", error: message };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function streetClipScoresToAnalysis(scores: StreetClipScore[]): AnalysisResult {
  const topPredictions = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      country: item.label,
      region: "",
      confidence: clamp01(item.score),
      reason: "StreetCLIP 零样本国家排序结果。"
    }));
  const top = topPredictions[0];

  return {
    top_predictions: topPredictions,
    estimated_location: {
      lat: null,
      lng: null,
      radius_km: 1500
    },
    clues: [
      {
        type: "camera_meta",
        observation: "StreetCLIP 对国家标签做零样本排序",
        interpretation: "用于快速粗筛，不等于坐标证据。",
        confidence: top ? top.confidence : 0.2
      }
    ],
    fast_answer: top ? `最可能是 ${top.country}` : "暂时无法判断",
    detailed_reasoning: "快速模式使用 StreetCLIP 零样本分类器直接给出国家候选，不做长文本推理。",
    next_observation_suggestions: [
      "补看路牌文字和道路标线。",
      "确认车道方向、护栏和电线杆。"
    ],
    uncertainties: [
      "快速模式结果是候选排序，不是最终答案。",
      "StreetCLIP 对某些国家和地区存在训练偏置。"
    ]
  };
}

function parseStreetClipScores(rawText: string): { ok: true; data: StreetClipScore[] } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    const scores = normalizeScores(parsed);
    if (scores.length === 0) {
      return { ok: false, error: "StreetCLIP 没有返回有效候选结果。" };
    }
    return { ok: true, data: scores };
  } catch {
    return { ok: false, error: "StreetCLIP 返回了不可解析的 JSON。" };
  }
}

function normalizeScores(value: unknown): StreetClipScore[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): StreetClipScore[] => {
    if (!isRecord(item) || typeof item.label !== "string") return [];
    return [
      {
        label: item.label.trim(),
        score: clamp01(typeof item.score === "number" ? item.score : Number(item.score))
      }
    ];
  });
}

function extractBase64Image(dataUrl: string): string {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

function postZeroShotRequest(
  endpoint: string,
  base64Image: string,
  options: StreetClipOptions,
  signal: AbortSignal
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      inputs: base64Image,
      parameters: {
        candidate_labels: options.candidateLabels,
        hypothesis_template: options.hypothesisTemplate ?? "This is a street-view scene from {}.",
        top_k: options.topK ?? 3
      },
      options: {
        wait_for_model: true,
        use_cache: true
      }
    })
  });
}

function normalizeStreetClipEndpoint(baseUrl: string, modelName: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return `https://api-inference.huggingface.co/models/${modelName}`;
  if (trimmed.startsWith("http")) {
    return trimmed.replace(
      /^https:\/\/router\.huggingface\.co\/hf-inference\/models\//i,
      "https://api-inference.huggingface.co/models/"
    );
  }
  return `https://api-inference.huggingface.co/models/${trimmed}`;
}

function toLegacyInferenceEndpoint(endpoint: string, modelName: string): string {
  if (!endpoint.includes("router.huggingface.co/hf-inference/models/")) return endpoint;
  return endpoint.replace(
    /^https:\/\/router\.huggingface\.co\/hf-inference\/models\//i,
    "https://api-inference.huggingface.co/models/"
  );
}

function shouldRetryWithLegacyInference(endpoint: string, status: number, rawText: string): boolean {
  const text = rawText.toLowerCase();
  return (
    status === 400 &&
    endpoint.includes("router.huggingface.co/hf-inference/models/") &&
    (text.includes("not deployed") || text.includes("inference provider") || text.includes("provider support"))
  );
}

function buildStreetClipError(status: number, statusText: string, rawText: string): string {
  const normalizedText = rawText.trim();
  if (status === 400 && /inference provider|not deployed|provider support/i.test(normalizedText)) {
    return "StreetCLIP 公共路由不可用，已建议切换到 Hugging Face Inference API；如果仍失败，请填写你自己的部署 URL。";
  }
  return `StreetCLIP 请求失败：${status} ${statusText}`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
