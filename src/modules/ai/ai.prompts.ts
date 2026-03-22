import type { AIGenerateRequest } from "./ai.provider.js";

export function buildTravelPrompt(req: AIGenerateRequest): string {
  const tripDays = getDayCount(req.startDate, req.endDate);
  const dateRange = `${req.startDate} to ${req.endDate}`;

  // ── Travelers ─────────────────────────────────────────────────────────────
  const travelerLines = req.travelers.map((t) => {
    const details: string[] = [
      `Age: ${t.age}`,
      `Starting from: ${t.startCity}`,
      t.travelStyle ? `Travel style: ${t.travelStyle}` : null,
      t.dietPref ? `Diet: ${t.dietPref}` : null,
      t.allergies ? `Allergies: ${t.allergies}` : null,
      t.interests?.length ? `Interests: ${t.interests.join(", ")}` : null,
      t.accessibilityNeeds?.length ? `Accessibility needs: ${t.accessibilityNeeds.join(", ")}` : null,
    ].filter(Boolean) as string[];
    return `  • ${t.name}: ${details.join(" | ")}`;
  });

  const minorLines =
    req.minors.length > 0
      ? req.minors.map((m) => {
          const parts = [`Age: ${m.age}`];
          if (m.specialNeeds) parts.push(`Special needs: ${m.specialNeeds}`);
          if (m.favActivities?.length) parts.push(`Loves: ${m.favActivities.join(", ")}`);
          return `  • ${m.name}: ${parts.join(" | ")}`;
        })
      : ["  None"];

  // ── Existing bookings ─────────────────────────────────────────────────────
  const bookingLines =
    req.existingBookings.length > 0
      ? req.existingBookings.map((b) => {
          const parts = [`[${b.type.toUpperCase()}]`];
          if (b.name) parts.push(b.name);
          if (b.confirmationRef) parts.push(`Ref: ${b.confirmationRef}`);
          if (b.date) parts.push(`Departs: ${b.date}${b.time ? ` at ${b.time}` : ""}`);
          if (b.arrivalDate) parts.push(`Arrives: ${b.arrivalDate}${b.arrivalTime ? ` at ${b.arrivalTime}` : ""}`);
          if (b.location) parts.push(`Route: ${b.location}`);
          if (b.cost) parts.push(`Cost: ${b.cost} ${req.currency}`);
          return `  • ${parts.join(" | ")}`;
        })
      : ["  None confirmed yet"];

  // ── Wishlist ──────────────────────────────────────────────────────────────
  const wishlistLines =
    req.wishlist.length > 0
      ? req.wishlist.map((w) => `  • ${w}`)
      : ["  None specified — use your expertise for the destination"];

  // ── Places to visit ───────────────────────────────────────────────────────
  const placesLines =
    req.placesToVisit.length > 0
      ? req.placesToVisit.map((p) => `  • ${p}`)
      : ["  None specified — recommend must-sees for the destination"];

  // ── Preferences ───────────────────────────────────────────────────────────
  const prefLines = [
    `  • Pace: ${req.preferences.pace ?? "moderate"} — ${getPaceDescription(req.preferences.pace)}`,
    req.preferences.focusAreas?.length
      ? `  • Focus areas: ${req.preferences.focusAreas.join(", ")}`
      : "  • Focus areas: balanced mix of culture, food, sightseeing, and leisure",
    `  • Avoid crowds: ${req.preferences.avoidCrowds ? "Yes — prefer off-peak timings and lesser-known spots" : "No preference"}`,
  ];

  // ── Example items (to show format — sightseeing + dining) ────────────────
  const exampleItem = `{
          "time": "09:30",
          "activity": "Fushimi Inari Taisha — hike through 10,000 vermilion torii gates up Mt Inari",
          "type": "sightseeing",
          "highlight": true,
          "bookingRequired": false,
          "closedOn": [],
          "openingHours": "24 hours (shrine open always, inner areas busier 08:00-16:00)",
          "tip": "Arrive before 8am to avoid crowds. Wear comfortable shoes — full hike is 4km. Look for fox (kitsune) statues throughout.",
          "thumbnail": "⛩️",
          "notes": "UNESCO-listed site, free entry. The torii gates were donated by businesses seeking good fortune. Kids love spotting the fox statues.",
          "costLocal": 0,
          "localCurrency": "JPY",
          "latitude": 34.9671,
          "longitude": 135.7727
        },
        {
          "time": "12:30",
          "activity": "Ichiran Ramen, Shinjuku — solo-booth tonkotsu ramen with rich pork broth",
          "type": "dining",
          "highlight": false,
          "bookingRequired": false,
          "closedOn": [],
          "openingHours": "24 hours",
          "tip": "Each person gets a private booth — order via the ticket machine. Customize broth richness, noodle firmness, and spice level on the sheet. Kids can order half portions.",
          "thumbnail": "🍜",
          "notes": "Ichiran is famous for its focused, distraction-free ramen experience. The Shinjuku branch is large with shorter waits than Shibuya.",
          "costLocal": 1200,
          "localCurrency": "JPY",
          "latitude": 35.6896,
          "longitude": 139.6994
        }`;

  return `You are a world-class travel planner creating a detailed, personalized ${tripDays}-day itinerary for a family trip to ${req.destination}.

════════════════════════════════════════════════════════════
TRIP OVERVIEW
════════════════════════════════════════════════════════════
Destination: ${req.destination}${req.subDestinations.length ? `\nSub-destinations/regions: ${req.subDestinations.join(", ")}` : ""}
Dates: ${dateRange} (${tripDays} days)
Currency: ${req.currency}${req.budget ? `\nTotal budget: ${req.budget.toLocaleString()} ${req.currency}` : ""}

════════════════════════════════════════════════════════════
TRAVELERS
════════════════════════════════════════════════════════════
Adults (${req.travelers.length}):
${travelerLines.join("\n")}

Children/Minors (${req.minors.length}):
${minorLines.join("\n")}

════════════════════════════════════════════════════════════
CONFIRMED BOOKINGS (must be incorporated exactly)
════════════════════════════════════════════════════════════
${bookingLines.join("\n")}

IMPORTANT: For confirmed flights/hotels, use the exact times, dates, and names provided. Build the itinerary around these fixed anchors.
• ARRIVAL RULE: On any day the group arrives by air/train, the FIRST itinerary item must be the arrival itself (e.g. "Land at Tokyo Narita (NRT) → Customs, baggage, immigration"). For international flights, add 2–3 hrs after arrival time for immigration + baggage + transfer. The first free activity must NOT be scheduled before (arrival time + 3 hrs minimum). If the flight lands at 08:00, no activities before 11:00.
• DEPARTURE RULE: On departure days, the last morning is for check-out and airport transfer. Don't schedule sightseeing after check-out if the flight is afternoon/evening.

════════════════════════════════════════════════════════════
TRAVELER PREFERENCES & TRAVEL STYLE
════════════════════════════════════════════════════════════
${prefLines.join("\n")}

════════════════════════════════════════════════════════════
WISHLIST — MUST INCLUDE (experiences/foods they specifically want)
════════════════════════════════════════════════════════════
${wishlistLines.join("\n")}

════════════════════════════════════════════════════════════
PLACES TO VISIT — PRIORITISE THESE
════════════════════════════════════════════════════════════
${placesLines.join("\n")}
${req.notes ? `
════════════════════════════════════════════════════════════
ADDITIONAL NOTES FROM THE ORGANISER (treat as high priority)
════════════════════════════════════════════════════════════
${req.notes}
` : ""}
════════════════════════════════════════════════════════════
PLANNING REQUIREMENTS
════════════════════════════════════════════════════════════
1. STRUCTURE: Exactly ${tripDays} days (${req.startDate} through ${req.endDate}), 5-8 items per day
2. TIMING: All activities must have realistic times. Respect travel time between locations. Don't schedule impossible back-to-back activities.
3. MEALS: Include breakfast, lunch, and dinner for every day. ALWAYS use the REAL restaurant or food-stall name — never write "a ramen restaurant" or "local café". Use the actual venue: e.g. "Ichiran Ramen, Shinjuku", "Tsukiji Outer Market — tuna sashimi breakfast", "Nishiki Market, Kyoto — street food walk". Activity format for dining: "Venue Name, Area — specific dish or experience to have". Note dietary requirements for each meal.
4. ACCOMMODATION: Note where the group is staying each night. First item on arrival day should be the flight/transport. Last item on departure day should be check-out and airport transfer.
5. HIGHLIGHTS: Mark 2-3 genuinely unmissable items per day as highlights (highlight: true). These should be the signature experiences of the trip.
6. BOOKING WARNINGS: If any attraction, restaurant, or experience requires advance booking, set bookingRequired: true. Be specific in the tip field about how far in advance to book.
7. CLOSURE WARNINGS: If any place is typically closed on specific days of the week (e.g., many Japanese museums close Mondays, some shrines have limited hours), populate closedOn with day names like ["Monday"]. Cross-check the actual day of week for each item's date.
8. OPENING HOURS: Always include opening hours for attractions, temples, museums, and restaurants when known. Format as "HH:MM - HH:MM" or human readable like "Daily 09:00-17:00, Last entry 16:30".
9. TIPS: Every activity should have a practical, insider tip — not generic. Include navigation tips, what to order, best time to visit, what to wear, what not to miss inside, local customs, etc.
10. COSTS: Use local destination currency. Include realistic per-person costs. Mark free activities as costLocal: 0.
11. KIDS: Since children are travelling, mark every activity with its family-friendliness in the notes. Suggest kid-specific things to do or see within each location.
12. DIETARY: Respect all dietary preferences across all meal recommendations.
13. GEOGRAPHY: Group nearby activities on the same day to minimise unnecessary travel. Use Google Maps logic for route efficiency.
14. AUTHENTIC: Recommend local restaurants over tourist traps. Include street food, markets, hidden gems alongside iconic landmarks.

════════════════════════════════════════════════════════════
RESPONSE FORMAT — JSON ONLY, NO MARKDOWN
════════════════════════════════════════════════════════════
Respond with ONLY a valid JSON object. No explanation, no markdown code blocks, no preamble.

{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "title": "Concise evocative day title (max 50 chars)",
      "summary": "One sentence capturing the essence of the day and what makes it special.",
      "accommodation": "Name of hotel/ryokan/accommodation where group stays tonight (or 'Transit' if travelling overnight)",
      "items": [
        ${exampleItem}
      ]
    }
  ],
  "checklist": [
    {
      "text": "Specific actionable item",
      "category": "documents|packing|health|transport|money|bookings|tech|culture|other"
    }
  ],
  "transportNotes": [
    {
      "icon": "✈️",
      "title": "Transport segment title",
      "detail": "Detailed practical info including costs, booking tips, journey time, alternatives"
    }
  ]
}

Item type values: hotel | sightseeing | dining | transport | adventure | culture | wellness | shopping | other

Generate a rich, comprehensive, highly practical itinerary that this family will actually use and love. Every item should feel personalised to THESE specific travelers, not generic.`;
}

function getPaceDescription(pace?: string): string {
  switch (pace) {
    case "slow": return "relaxed days, 3-4 activities max, plenty of rest time, linger at each spot";
    case "fast": return "action-packed days, 6-8 activities, efficient transitions, maximise experiences";
    default: return "balanced days, 5-6 activities, comfortable pace with some breathing room";
  }
}

function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
