import type { AIGenerateResponse } from "./ai.provider.js";

export function parseAIResponse(text: string): Omit<AIGenerateResponse, "tokensUsed"> {
  let parsed: Record<string, unknown>;

  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    parsed = JSON.parse(jsonText?.trim() ?? "{}") as Record<string, unknown>;
  } catch (err) {
    console.error("[AI Parser] JSON parse failed:", (err as Error).message.substring(0, 100));
    console.error("[AI Parser] Text length:", text.length, "Last 100 chars:", text.slice(-100));
    return { days: [], checklist: [], transportNotes: [] };
  }

  const days = Array.isArray(parsed.days)
    ? parsed.days.map((day: unknown) => {
        const d = day as Record<string, unknown>;
        return {
          dayNumber: Number(d.dayNumber) || 1,
          date: String(d.date || ""),
          title: String(d.title || ""),
          summary: String(d.summary || ""),
          accommodation: String(d.accommodation || ""),
          items: Array.isArray(d.items)
            ? d.items.map((item: unknown) => {
                const it = item as Record<string, unknown>;
                return {
                  time: String(it.time || "09:00"),
                  activity: String(it.activity || ""),
                  type: String(it.type || "other"),
                  highlight: Boolean(it.highlight),
                  bookingRequired: Boolean(it.bookingRequired),
                  closedOn: Array.isArray(it.closedOn)
                    ? (it.closedOn as unknown[]).map(String)
                    : [],
                  openingHours: it.openingHours ? String(it.openingHours) : null,
                  tip: it.tip ? String(it.tip) : null,
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
        return { text: String(c.text || ""), category: String(c.category || "other") };
      })
    : [];

  const transportNotes = Array.isArray(parsed.transportNotes)
    ? parsed.transportNotes.map((note: unknown) => {
        const n = note as Record<string, unknown>;
        return {
          icon: String(n.icon || ""),
          title: String(n.title || ""),
          detail: String(n.detail || ""),
        };
      })
    : [];

  return { days, checklist, transportNotes };
}
