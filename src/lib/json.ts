export function parseLooseJson<T>(raw: string): { ok: true; data: T } | { ok: false; error: string } {
  const cleaned = stripJsonFences(raw);

  try {
    return { ok: true, data: JSON.parse(cleaned) as T };
  } catch {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return { ok: true, data: JSON.parse(objectMatch[0]) as T };
      } catch {
        return { ok: false, error: "The model did not return parseable JSON." };
      }
    }

    return { ok: false, error: "The model did not return parseable JSON." };
  }
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}
