/**
 * Fix Japan trip Day 2 itinerary — arrival day (17 Mar 2026)
 * Flight arrives at 07:55 NRT; must add arrival sequence + push activities to 11 AM+
 *
 * Run on server: node scripts/fix-japan-day2.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the Japan trip
  const japanTrip = await prisma.trip.findFirst({
    where: {
      OR: [
        { destination: { contains: "Japan", mode: "insensitive" } },
        { destination: { contains: "Tokyo", mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    select: { id: true, title: true, destination: true },
  });

  if (!japanTrip) {
    console.error("❌ Japan trip not found");
    process.exit(1);
  }

  console.log(`✓ Found trip: "${japanTrip.title}" (${japanTrip.destination}) — ID: ${japanTrip.id}`);

  // Find Day 2 (17 May 2026 = arrival day at Tokyo Haneda 07:55)
  const day2 = await prisma.itineraryDay.findFirst({
    where: {
      tripId: japanTrip.id,
      dayNumber: 2,
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!day2) {
    console.error("❌ Day 2 (17 Mar 2026) not found in itinerary");
    process.exit(1);
  }

  console.log(`\n✓ Day 2: "${day2.title}"`);
  console.log(`  Current items (${day2.items.length}):`);
  day2.items.forEach((item) => {
    console.log(`    ${item.time} — ${item.activity.slice(0, 70)}`);
  });

  // Delete all current Day 2 items
  await prisma.itineraryItem.deleteMany({ where: { dayId: day2.id } });
  console.log("\n  ✓ Cleared existing Day 2 items");

  // Update day title and summary
  await prisma.itineraryDay.update({
    where: { id: day2.id },
    data: {
      title: "Touchdown Tokyo — Arrival & Tsukiji First Steps",
      summary: "Land at Haneda at 07:55, clear the very efficient immigration, transfer to Tsukiji hotel, then ease into Tokyo with a gentle afternoon — market, Ueno park, and Teamlab wonder.",
    },
  });

  // Create the corrected Day 2 items with realistic post-arrival timing
  // Haneda is very efficient (30 min customs vs 60+ min at Narita)
  const items = [
    {
      sortOrder: 0,
      time: "07:55",
      activity: "Land at Tokyo Haneda International Airport (HND) Terminal 3 — International arrivals",
      type: "transport",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: null,
      tip: "Haneda immigration is one of the fastest in Asia — expect 20–30 min for international passengers. Fill in the Arrival Card on the plane (cards distributed mid-flight). Fingerprint scan required. SIM card counters and IC card (Suica) kiosks are in the arrivals lobby.",
      thumbnail: "✈️",
      notes: "Collect all baggage, pass customs, then head to the arrivals hall. Buy a Suica card for each person (¥500 deposit + top-up) — it works on all Tokyo trains, buses, and convenience stores. MoneyGram and 7-Eleven ATMs accept international cards for yen withdrawal.",
      latitude: 35.5494,
      longitude: 139.7798,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 1,
      time: "08:30",
      activity: "Breakfast at Haneda Terminal 3 arrivals — 7-Eleven or Lawson convenience store, or Yoshinoya",
      type: "dining",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "24 hours",
      tip: "Japan 7-Eleven is legendary — hot onigiri (rice balls), egg sandwiches, hot soups, tamagoyaki are all excellent. Tamjeed & Vani: pick onigiri with ume (plum) or kombu (seaweed) filling — always vegetarian. Hansika: try Melon-pan (sweet bread) from the bakery counter.",
      thumbnail: "🍙",
      notes: "This is the perfect moment to get your bearings, grab a drink, and collect yourselves before the 30-min transfer. Don't spend too long here — Tsukiji awaits.",
      latitude: 35.5494,
      longitude: 139.7798,
      costLocal: 700,
      localCurrency: "JPY",
    },
    {
      sortOrder: 2,
      time: "09:00",
      activity: "Transfer from Haneda to Tosei Hotel Cocone Tsukiji — Tokyo Monorail + Yamanote Line (30 min)",
      type: "transport",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "Trains run every 5 min",
      tip: "Take the Tokyo Monorail from HND T3 to Hamamatsucho (~18 min, ¥500), then switch to the Yamanote Line to Shimbashi (2 stops), then walk 8 min to the hotel. Suica card makes this seamless — no ticket buying. Alternatively, taxi from HND is ~¥5,000–6,000 (30 min).",
      thumbnail: "🚉",
      notes: "The monorail gives a great aerial view of Tokyo Bay as you enter the city — kids will love spotting Rainbow Bridge and the Odaiba Ferris wheel. Large suitcases fit in the luggage area at the end of each carriage.",
      latitude: 35.6658,
      longitude: 139.7597,
      costLocal: 500,
      localCurrency: "JPY",
    },
    {
      sortOrder: 3,
      time: "09:45",
      activity: "Check in at Tosei Hotel Cocone Tsukiji Ginza Premier — drop luggage, freshen up",
      type: "hotel",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "Check-in from 15:00 (early check-in if room ready, otherwise luggage storage)",
      tip: "Arrival before 15:00 is early check-in — ask nicely and they may have a room ready. If not, store all luggage at the front desk (free) and head straight to Tsukiji. The hotel has a small lounge where you can freshen up. Request rooms on higher floors for better views.",
      thumbnail: "🏨",
      notes: "Tosei Hotel is literally steps from Tsukiji Outer Market — perfect location for your first morning. The hotel has a convenience store next door and is walking distance from Ginza for evening shopping.",
      latitude: 35.6645,
      longitude: 139.7703,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 4,
      time: "11:00",
      activity: "Tsukiji Outer Market — fresh sushi breakfast, tamagoyaki, street snacks",
      type: "dining",
      highlight: true,
      bookingRequired: false,
      closedOn: ["Wednesday"],
      openingHours: "05:00–14:00 (most stalls close by 13:00 — don't be late)",
      tip: "The Outer Market is still very much alive for tourists. Must-try: freshly grilled tamagoyaki (egg omelette on a stick) at Tamagoya Chiyoda, and uni (sea urchin) or salmon sashimi at Sushi Dai's casual stalls. Tamjeed & Vani: Tama-chan sells vegetarian tamago sushi. Try the green tea soft-serve from Manten.",
      thumbnail: "🐟",
      notes: "The famous Inner Market tuna auction moved to Toyosu — but Outer Market remains excellent for a real Tokyo fish market experience. Walk slowly, snack as you go. Great photo spots with the vendors and hanging seafood displays.",
      latitude: 35.6655,
      longitude: 139.7705,
      costLocal: 2000,
      localCurrency: "JPY",
    },
    {
      sortOrder: 5,
      time: "13:30",
      activity: "Ueno Park — leisurely stroll, feed ducks at Shinobazu Pond, peek at Ueno Zoo entrance",
      type: "sightseeing",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "Open 24 hours (museums from 09:30)",
      tip: "Keep this easy — it's still your first day and jet lag starts peaking at 14:00–16:00 IST equivalent. Walk the cherry blossom path even if not in season (trees are beautiful), rent a row boat on Shinobazu Pond (¥600/30 min), and let the kids explore.",
      thumbnail: "🌸",
      notes: "Ueno is a 20-min train ride from Tsukiji on the Hibiya Line. The park is enormous — don't try to do the museums today. Tokyo National Museum alone needs 3 hours.",
      latitude: 35.7148,
      longitude: 139.7731,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 6,
      time: "16:30",
      activity: "teamLab Planets Tokyo DMMO — immersive digital art installation, Toyosu",
      type: "culture",
      highlight: true,
      bookingRequired: true,
      closedOn: [],
      openingHours: "09:00–21:00 (last entry 20:00)",
      tip: "BOOK IN ADVANCE — tickets sell out weeks ahead (¥3,200/adult, ¥1,000/child 4-12). Bring a change of socks — you wade through water in some rooms. Long clothes recommended for some exhibits. No bags allowed inside — use the locker room. The DNA room is mind-blowing.",
      thumbnail: "🌊",
      notes: "teamLab Planets is one of the most unique experiences in the world — digital art you physically walk through, including knee-deep water fields with floating flowers. Kids are absolutely mesmerized. The Toyosu location is better for families than teamLab Borderless.",
      latitude: 35.6481,
      longitude: 139.7948,
      costLocal: 3200,
      localCurrency: "JPY",
    },
    {
      sortOrder: 7,
      time: "19:30",
      activity: "Dinner at Saizeriya Tsukiji — vegetarian-friendly Italian chain, affordable and family-friendly",
      type: "dining",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "11:00–23:00",
      tip: "Saizeriya is a beloved Japanese budget-Italian chain with huge portions at very low prices. The margherita pizza (¥399), focaccia (¥249), and minestrone soup (¥199) are all vegetarian. Non-veg: try the doria (rice gratin). Perfect for tired first-day travelers — close to hotel.",
      thumbnail: "🍝",
      notes: "Walk back to the hotel after dinner — it's only 5 min. Get to bed early tonight — jet lag will be real tomorrow morning. Set alarms for 07:00 JST to reset your body clock.",
      latitude: 35.6645,
      longitude: 139.7698,
      costLocal: 1200,
      localCurrency: "JPY",
    },
  ];

  await prisma.itineraryItem.createMany({
    data: items.map((item) => ({
      dayId: day2.id,
      ...item,
    })),
  });

  console.log(`\n✅ Day 2 updated! New schedule:`);
  items.forEach((item) => {
    console.log(`  ${item.time} — ${item.activity.slice(0, 70)}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
