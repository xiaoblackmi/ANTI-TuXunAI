import type { GameCase, LearnedRule } from "./types";

const GEO_KNOWLEDGE_FRAMEWORK = `
You are a street-view geolocation training assistant. Use only the currently visible image. Do not use hidden coordinates, page internals, platform APIs, network responses, or invisible metadata.

Observation framework:
- Driving side: left-hand or right-hand traffic is only a supporting clue. Cross-check it with lane markings, shoulders, parked vehicles, and road layout.
- Sign and language: identify scripts and sign shapes, but never claim to read text that is not visible.
- Plates: long European plates, shorter American plates, front-plate presence, color blocks, and blur shape are weak clues.
- Road markings: yellow center lines, white edge lines, double lines, dashed/solid combinations, shoulder width.
- Vegetation and climate: tropical, temperate, dry, cold, mountain, coastal, or other visible environment cues.
- Architecture: rural Europe, North American suburbs, Latin American towns, Southeast Asian roadside buildings, and other visible styles.
- Utility poles: wood, concrete, overhead wire density, cross-arm shape.
- Guardrails and posts: European bollards, Australia/New Zealand road markers, South American mountain-road rails.
- Street-view quality and camera traits may be supporting evidence, but never the only evidence.
`.trim();

const RESULT_SCHEMA = `
Return strict JSON only. It must be parseable by JSON.parse. Do not return Markdown or code fences:
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

Task: quickly estimate the most likely country or region from the visible street-view image. Target response time is 2-5 seconds.
Requirements:
- Return exactly the top 3 country or region candidates when possible.
- Keep each reason to one sentence.
- Return at most 5 clues.
- Keep detailed_reasoning under 80 words.
- Return at most 2 next_observation_suggestions.
- If uncertain, say so. Do not invent text, coordinates, or hidden metadata.

${formatLearnedRules(learnedRules)}

${RESULT_SCHEMA}
`.trim();
}

export function buildDetailedGeoPrompt(learnedRules: LearnedRule[]): string {
  return `
${GEO_KNOWLEDGE_FRAMEWORK}

Task: analyze visible street-view geolocation clues and provide country/region candidates, approximate coordinate range, confidence, evidence, and next observation suggestions.
Requirements:
- Return 3 top_predictions.
- Return 6-10 clues, prioritizing reusable clues that help future rounds.
- If there is not enough evidence for coordinates, use null for lat/lng and increase radius_km.
- Keep the answer concise. Every conclusion must tie back to visible evidence.
- Put meaningful doubts in uncertainties.

${formatLearnedRules(learnedRules)}

${RESULT_SCHEMA}
`.trim();
}

export function buildFeedbackLearningPrompt(gameCase: GameCase): string {
  return `
You are a street-view geolocation review coach. Convert one corrected round into up to 3 reusable learned rules.
Requirements:
- Rules must be short, specific, and transferable.
- Do not write generic advice like "observe more carefully next time".
- Do not claim to use hidden data.
- Return strict JSON only. Do not return Markdown.

Input:
Original AI prediction:
${JSON.stringify(gameCase.aiPrediction ?? {}, null, 2)}

Correct answer:
Country/region: ${gameCase.correctCountry}
City/area: ${gameCase.correctRegion || "not provided"}
Coordinates: ${gameCase.correctLat ?? "not provided"}, ${gameCase.correctLng ?? "not provided"}

User correction:
${gameCase.userCorrectionText}

Tags:
${gameCase.tags.join(", ") || "not provided"}

Return format:
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
    return "User learned rules: none yet.";
  }

  return [
    "User learned rules from past corrections. Use them as hints, not as hard truth:",
    ...rules.map((rule, index) => {
      const place = [rule.country, rule.region].filter(Boolean).join(" / ");
      const tags = rule.tags.length ? `; tags: ${rule.tags.join(", ")}` : "";
      return `${index + 1}. ${rule.title}: ${rule.ruleText}${place ? `; applies to: ${place}` : ""}${tags}`;
    })
  ].join("\n");
}
