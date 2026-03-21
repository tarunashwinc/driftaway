import type { AIGenerateRequest } from "./ai.provider.js";

export function buildTravelPrompt(req: AIGenerateRequest): string {
  const tripDays = getDayCount(req.startDate, req.endDate);

  const travelerDescriptions = req.travelers
    .map((t) => {
      const details = [
        t.age ? `age ${t.age}` : null,
        t.travelStyle ? `${t.travelStyle} traveler` : null,
        t.dietPref ? `diet: ${t.dietPref}` : null,
        t.allergies ? `allergies: ${t.allergies}` : null,
        t.interests?.length ? `interests: ${t.interests.join(", ")}` : null,
        t.accessibilityNeeds?.length ? `accessibility: ${t.accessibilityNeeds.join(", ")}` : null,
        `starting from ${t.startCity}`,
      ]
        .filter(Boolean)
        .join(", ");
      return `- ${t.name} (${details})`;
    })
    .join("\n");

  const minorDescriptions =
    req.minors.length > 0
      ? req.minors
          .map((m) => `- ${m.name} (age ${m.age}${m.specialNeeds ? `, ${m.specialNeeds}` : ""})`)
          .join("\n")
      : "None";

  const bookingsInfo =
    req.existingBookings.length > 0
      ? req.existingBookings
          .map(
            (b) =>
              `- ${b.type}: ${b.name ?? ""} on ${b.date ?? "TBD"} at ${b.time ?? "TBD"} (${b.location ?? ""})`,
          )
          .join("\n")
      : "None";

  return `You are an expert travel planner creating a detailed ${tripDays}-day itinerary.

TRIP DETAILS:
- Destination: ${req.destination}${req.subDestinations.length ? ` (including ${req.subDestinations.join(", ")})` : ""}
- Dates: ${req.startDate} to ${req.endDate} (${tripDays} days)
- Currency: ${req.currency}${req.budget ? `\n- Budget: ${req.budget} ${req.currency}` : ""}

TRAVELERS:
${travelerDescriptions}

CHILDREN/MINORS:
${minorDescriptions}

PREFERENCES:
- Pace: ${req.preferences.pace ?? "moderate"}
- Focus areas: ${req.preferences.focusAreas?.join(", ") ?? "balanced mix"}
- Avoid crowds: ${req.preferences.avoidCrowds ? "yes" : "no"}

EXISTING BOOKINGS (must be incorporated):
${bookingsInfo}

Please create a comprehensive travel plan. Respond ONLY with a valid JSON object (no markdown, no explanation) in exactly this format:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "title": "Arrival & Exploration",
      "items": [
        {
          "time": "HH:MM",
          "activity": "Activity name and description",
          "type": "hotel|sightseeing|dining|transport|adventure|culture|wellness|shopping|other",
          "latitude": 12.345,
          "longitude": 67.890,
          "costLocal": 500,
          "localCurrency": "INR",
          "thumbnail": "🏨",
          "notes": "Optional tips",
          "accessibility": []
        }
      ]
    }
  ],
  "checklist": [
    { "text": "Pack sunscreen", "category": "packing" },
    { "text": "Book airport transfer", "category": "transport" }
  ],
  "transportNotes": [
    { "icon": "✈️", "title": "Flight", "detail": "Book 2 months in advance for best prices" }
  ]
}

Important:
- Create exactly ${tripDays} days
- Include 4-7 items per day with realistic times
- First item should be arrival/check-in on day 1, last item checkout on final day
- Include meals (breakfast, lunch, dinner) spread throughout days
- Costs should be in local destination currency
- Use emoji for thumbnails
- Keep activities appropriate for all travelers (especially minors if present)
- Consider dietary restrictions and accessibility needs`;
}

function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
