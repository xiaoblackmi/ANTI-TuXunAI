import type { GameCase, LearnedRule } from "./types";

const GEO_KNOWLEDGE_FRAMEWORK = `
你是街景地理定位训练助手。只能基于当前可见画面判断，禁止使用隐藏坐标、网页内部变量、后台接口或不可见元数据。

观察方向：
- 道路方向：左行/右行只作为辅助，结合车道线、路肩和车辆停放方向。
- 路牌语言：拉丁字母、西里尔字母、阿拉伯字母、泰文、日文、韩文等；不要声称读到了画面中不存在的文字。
- 车牌：欧洲长条车牌、美洲短牌、是否有前牌、颜色块和模糊形态只能作为弱线索。
- 道路标线：黄中线、白边线、双白线、虚实线、路肩宽度。
- 植被气候：热带、温带、干旱、寒带、山地、海岸等。
- 建筑：欧洲乡村、北美郊区、拉美城镇、东南亚路边建筑等。
- 电线杆：木杆、水泥杆、密集架空线、横担形态。
- 护栏和路桩：欧洲 bollard、澳新路标、南美山路护栏等。
- 街景质量和相机特征只能作为辅助证据，不能当作唯一依据，也不能瞎编。
`.trim();

const RESULT_SCHEMA = `
返回严格 JSON，必须能被 JSON.parse 解析，不要 Markdown，不要代码块：
{
  "top_predictions": [
    {
      "country": "string",
      "region": "string",
      "confidence": 0.0,
      "reason": "string"
    }
  ],
  "estimated_location": {
    "lat": null,
    "lng": null,
    "radius_km": 500
  },
  "clues": [
    {
      "type": "road_marking | sign | language | vegetation | architecture | utility_pole | license_plate | climate | camera_meta | other",
      "observation": "string",
      "interpretation": "string",
      "confidence": 0.0
    }
  ],
  "fast_answer": "string",
  "detailed_reasoning": "string",
  "next_observation_suggestions": ["string"],
  "uncertainties": ["string"]
}
`.trim();

export function buildFastGeoPrompt(learnedRules: LearnedRule[]): string {
  return `
${GEO_KNOWLEDGE_FRAMEWORK}

任务：快速判断当前街景最可能的国家/地区。目标响应时间 2-5 秒。
要求：
- 只输出 Top 3 国家/地区。
- 每个 reason 控制在一句话内。
- clues 最多 5 条。
- detailed_reasoning 控制在 80 字以内。
- next_observation_suggestions 最多 2 条。
- 不确定就写不确定，禁止编造画面文字或隐藏信息。

${formatLearnedRules(learnedRules)}

${RESULT_SCHEMA}
`.trim();
}

export function buildDetailedGeoPrompt(learnedRules: LearnedRule[]): string {
  return `
${GEO_KNOWLEDGE_FRAMEWORK}

任务：精准分析当前街景定位线索，给出国家/地区、可能坐标范围、置信度、依据和下一步观察建议。
要求：
- top_predictions 返回 3 个候选。
- clues 返回 6-10 条，优先写能迁移到以后判断的线索。
- estimated_location 如果没有足够依据，lat/lng 使用 null，并扩大 radius_km。
- 不要输出超长废话；所有结论必须绑定可见线索。
- 不确定就明确写进 uncertainties。

${formatLearnedRules(learnedRules)}

${RESULT_SCHEMA}
`.trim();
}

export function buildFeedbackLearningPrompt(gameCase: GameCase): string {
  return `
你是街景定位复盘教练。请把一次错误或纠偏总结为最多 3 条可复用经验规则。
要求：
- 规则短、准、可迁移。
- 不要写“以后注意观察”这类空话。
- 不要声称使用了隐藏数据。
- 只返回严格 JSON，不要 Markdown。

输入：
AI 原判断：
${JSON.stringify(gameCase.aiPrediction ?? {}, null, 2)}

正确答案：
国家/地区：${gameCase.correctCountry}
城市/区域：${gameCase.correctRegion || "未提供"}
经纬度：${gameCase.correctLat ?? "未提供"}, ${gameCase.correctLng ?? "未提供"}

用户纠错说明：
${gameCase.userCorrectionText}

标签：
${gameCase.tags.join(", ") || "未提供"}

返回格式：
{
  "rules": [
    {
      "title": "string",
      "ruleText": "string",
      "country": "string",
      "region": "string",
      "tags": ["string"],
      "confidence": 0.0
    }
  ]
}
`.trim();
}

function formatLearnedRules(rules: LearnedRule[]): string {
  if (rules.length === 0) {
    return "用户历史纠错经验：暂无。";
  }

  return [
    "以下是用户过去纠错总结出的经验规则，你需要参考但不要盲从：",
    ...rules.map((rule, index) => {
      const place = [rule.country, rule.region].filter(Boolean).join(" / ");
      const tags = rule.tags.length ? `；标签：${rule.tags.join(", ")}` : "";
      return `${index + 1}. ${rule.title}：${rule.ruleText}${place ? `；适用：${place}` : ""}${tags}`;
    })
  ].join("\n");
}
