import type { GameCase, LearnedRule } from "./types";

const GEO_KNOWLEDGE_FRAMEWORK = `
你是街景定位训练助手。只能根据当前可见截图判断，不能读取隐藏坐标、页面变量、平台接口、网络响应或不可见元数据。

重要约束：
- 每次截图都是独立新题，不要延续上一张图或上一局的国家判断。
- 历史学习规则只能作为弱提示，不能把过去的国家候选当成本题答案。
- 不确定就明确写不确定，不要编造看不清的文字、车牌或路牌。

观察方向：
- 行驶方向：左行/右行只能作为辅助线索，要结合车道、停靠车辆、路肩判断。
- 路牌和语言：看文字体系、路牌颜色、形状、道路编号样式，但不要声称看到了不存在的字。
- 车牌：欧洲长条牌、美洲短牌、是否有前牌、颜色块和模糊形态都只是弱线索。
- 道路标线：黄中线、白边线、双白线、虚实线、路肩宽度。
- 植被气候：热带、温带、干旱、寒冷、山地、海岸等可见环境。
- 建筑风格：欧洲乡村、北美郊区、拉美城镇、东南亚路边建筑等。
- 电线杆：木杆、水泥杆、横担形态、架空线密度。
- 护栏和路桩：欧洲 bollard、澳新路标、南美山路护栏等。
- 街景画质和相机特征只能作为辅助证据，不能作为唯一依据。
`.trim();

const RESULT_SCHEMA = `
只返回严格 JSON，必须能被 JSON.parse 解析。不要 Markdown，不要代码块：
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

任务：快速判断当前截图最可能的国家/地区，目标 2-5 秒。
输出要求：
- top_predictions 最多 3 个。
- clues 最多 4 条，只写最关键可见线索。
- 每个 reason 一句话。
- detailed_reasoning 不超过 50 个中文字。
- next_observation_suggestions 最多 2 条。
- 坐标证据不足时 lat/lng 用 null，radius_km 放大。

${formatLearnedRules(learnedRules)}

${RESULT_SCHEMA}
`.trim();
}

export function buildDetailedGeoPrompt(learnedRules: LearnedRule[]): string {
  return `
${GEO_KNOWLEDGE_FRAMEWORK}

任务：基于当前截图做较完整的街景定位推理，给出国家/地区候选、可能坐标范围、置信度、依据和下一步观察建议。
输出要求：
- top_predictions 固定 3 个。
- clues 6-8 条，优先写能复用到以后判断的线索。
- 结论必须绑定可见证据；证据不足时要写进 uncertainties。
- 坐标不确定时 lat/lng 用 null，并扩大 radius_km。
- 不要输出长篇解释。

${formatLearnedRules(learnedRules)}

${RESULT_SCHEMA}
`.trim();
}

export function buildFeedbackLearningPrompt(gameCase: GameCase): string {
  return `
你是街景定位复盘助手。请把本局纠错总结成最多 3 条可复用经验规则。
要求：
- 每条规则短、准、可迁移。
- 不要写“以后仔细观察”这类空话。
- 不要声称使用隐藏数据。
- 只返回严格 JSON，不要 Markdown。

本局 AI 原判断：
${JSON.stringify(gameCase.aiPrediction ?? {}, null, 2)}

正确答案：
国家/地区：${gameCase.correctCountry}
城市/区域：${gameCase.correctRegion || "未提供"}
经纬度：${gameCase.correctLat ?? "未提供"}, ${gameCase.correctLng ?? "未提供"}

用户纠错说明：
${gameCase.userCorrectionText || "未提供"}

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
    return "本地学习规则：本次不使用历史规则。";
  }

  return [
    "以下是用户过去纠错总结出的本地经验规则。只能参考，不能盲从：",
    ...rules.map((rule, index) => {
      const place = [rule.country, rule.region].filter(Boolean).join(" / ");
      const tags = rule.tags.length ? `；标签：${rule.tags.join(", ")}` : "";
      return `${index + 1}. ${rule.title}：${rule.ruleText}${place ? `；适用：${place}` : ""}${tags}`;
    })
  ].join("\n");
}
