import type { AnalysisResult, FeedbackLearningResponse, ModelJsonResponse, VisionCallOptions } from "./types";
import { parseLooseJson } from "./json";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

export async function callVisionModel(
  imageDataUrl: string,
  prompt: string,
  options: VisionCallOptions
): Promise<ModelJsonResponse<AnalysisResult>> {
  return callOpenAiCompatibleJson<AnalysisResult>(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ],
    options
  );
}

export async function callTextModelForJson<T = FeedbackLearningResponse>(
  prompt: string,
  options: VisionCallOptions
): Promise<ModelJsonResponse<T>> {
  return callOpenAiCompatibleJson<T>(
    [
      {
        role: "user",
        content: [{ type: "text", text: prompt }]
      }
    ],
    options
  );
}

async function callOpenAiCompatibleJson<T>(
  messages: unknown[],
  options: VisionCallOptions
): Promise<ModelJsonResponse<T>> {
  if (!options.apiKey.trim()) {
    return { ok: false, data: null, rawText: "", error: "请先在设置页填写 API Key。" };
  }

  const endpoint = `${options.apiBaseUrl.replace(/\/+$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let response = await fetchJson(
      endpoint,
      messages,
      options,
      controller.signal,
      options.useResponseFormat !== false,
      shouldDisableQwenThinking(options)
    );

    let responseText = await response.text();
    if (!response.ok && shouldRetryWithoutStructuredOptions(responseText)) {
      response = await fetchJson(endpoint, messages, options, controller.signal, false, false);
      responseText = await response.text();
    }

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        rawText: responseText,
        error: `API 请求失败：${response.status} ${response.statusText}`
      };
    }

    const completion = JSON.parse(responseText) as ChatCompletionResponse;
    const rawText = extractMessageContent(completion);
    const parsed = parseLooseJson<T>(rawText);
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
        ? "请求超时。快速判断失败，可以切换精准模式重试。"
        : error instanceof Error
          ? error.message
          : "未知 API 错误。";
    return { ok: false, data: null, rawText: "", error: message };
  } finally {
    window.clearTimeout(timeout);
  }
}

function fetchJson(
  endpoint: string,
  messages: unknown[],
  options: VisionCallOptions,
  signal: AbortSignal,
  includeResponseFormat: boolean,
  disableQwenThinking: boolean
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.modelName,
      messages,
      temperature: 0.2,
      max_tokens: options.maxTokens ?? 1200,
      ...(includeResponseFormat ? { response_format: { type: "json_object" } } : {}),
      ...(disableQwenThinking ? { enable_thinking: false } : {})
    })
  });
}

function shouldDisableQwenThinking(options: VisionCallOptions): boolean {
  const baseUrl = options.apiBaseUrl.toLowerCase();
  const model = options.modelName.toLowerCase();
  return (baseUrl.includes("dashscope") || baseUrl.includes("aliyuncs")) && model.includes("qwen3-vl");
}

function shouldRetryWithoutStructuredOptions(responseText: string): boolean {
  const text = responseText.toLowerCase();
  return text.includes("response_format") || text.includes("enable_thinking");
}

function extractMessageContent(completion: ChatCompletionResponse): string {
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }
  return "";
}

