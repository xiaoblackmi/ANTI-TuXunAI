import { describe, expect, it } from "vitest";
import { parseLooseJson } from "./json";

describe("parseLooseJson", () => {
  it("parses plain JSON", () => {
    const parsed = parseLooseJson<{ ok: boolean }>('{"ok":true}');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.ok).toBe(true);
  });

  it("strips JSON code fences", () => {
    const parsed = parseLooseJson<{ country: string }>('```json\n{"country":"Japan"}\n```');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.country).toBe("Japan");
  });

  it("extracts the first JSON object from surrounding text", () => {
    const parsed = parseLooseJson<{ confidence: number }>('Result:\n{"confidence":0.7}\nThanks');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.confidence).toBe(0.7);
  });
});
