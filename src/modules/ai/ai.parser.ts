import type { AIGenerateResponse } from "./ai.provider.js";

export function parseAIResponse(text: string): Omit<AIGenerateResponse, "tokensUsed"> {
  let parsed: Record<string, unknown>;

  try {
    // Try to extract JSON if wrapped in markdown
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    parsed = JSON.parse(jsonText?.trim() ?? "{}") as Record<string, unknown>;
  } catch {
    // Return empty structure if parsing fails
    return { days: [], checklist: [], transportNotes: [] };
  }

  const days = Array.isArray(parsed.days)
    ? parsed.days.map((day: unknown) => {
        const d = day as Record<string, unknown>;
        return {
          dayNumber: Number(d.dayNumber) || 1,
          date: String(d.date || ""),
          title: String(d.title || ""),
          items: Array.isArray(d.items)
            ? d.items.map((item: unknown) => {
                const it = item as Record<string, unknown>;
                return {
                  time: String(it.time || "09:00"),
                  activity: String(it.activity || ""),
                  type: String(it.type || "other"),
                  latitude: it.latitude !== undefined ? Number(it.latitude) : undefined,
                  longitude: it.longitude !== undefined ? Number(it.longitude) : undefined,
                  costLocal: it.costLocal !== undefined ? Number(it.costLocal) : undefined,
                  localCurrency: it.localCurrency !== undefined ? String(it.localCurrency) : undefined,
                  thumbnail: it.thumbnail !== undefined ? String(it.thumbnail) : undefined,
                  notes: it.notes !== undefined ? String(it.notes) : undefined,
                  accessibility: Array.isArray(it.accessibility)
                    ? (it.accessibility as unknown[]).map(String)
                    : [],
                };
              })
            : [],
        };
      })
    : [];

  const checklist = Array.isArray(parsed.checklist)
    ? parsed.checklist.map((item: unknown) => {
        const c = item as Record<string, unknown>;
        return { text: String(c.text || ""), category: String(c.category || "general") };
      })
    : [];

  const transportNotes = Array.isArray(parsed.transportNotes)
    ? parsed.transportNotes.map((note: unknown) => {
        const n = note as Record<string, unknown>;
        return { icon: String(n.icon || ""), title: String(n.title || ""), detail: String(n.detail || "") };
      })
    : [];

  return { days, checklist, transportNotes };
}
