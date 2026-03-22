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

  // Find Day 2 (17 Mar 2026 = arrival day)
  const day2 = await prisma.itineraryDay.findFirst({
    where: {
      tripId: japanTrip.id,
      date: new Date("2026-03-17"),
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
      title: "Touchdown Tokyo — Arrival & First Impressions",
      summary: "Land at Narita, clear immigration, transfer to hotel, then ease into Tokyo with a gentle afternoon stroll and your first ramen.",
    },
  });

  // Create the corrected Day 2 items
  const items = [
    {
      sortOrder: 0,
      time: "07:55",
      activity: "Land at Tokyo Narita International Airport (NRT) — International arrival terminal",
      type: "transport",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: null,
      tip: "Immigration queues can be long (30–60 min). Have your Arrival Card filled in on the plane — cards are distributed mid-flight. Fingerprint scan and photo required for all foreign nationals.",
      thumbnail: "✈️",
      notes: "Exit immigration, collect baggage, pass customs. Look for the Welcome to Japan sign. SIM card and IC card counters are in the arrivals hall — grab both before heading out.",
      latitude: 35.7719,
      longitude: 140.3929,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 1,
      time: "09:00",
      activity: "Airport breakfast at Narita — Yoshinoya or convenience store (7-Eleven / Lawson) in arrivals",
      type: "dining",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "24 hours",
      tip: "7-Eleven Japan has outstanding hot food — onigiri, egg sandwiches, hot soups, tamagoyaki. Perfect quick breakfast before the transfer. Tamjeed & Vani: look for the 'vegetarian' label or ask for onigiri with ume (plum) or kombu (seaweed) filling.",
      thumbnail: "🍙",
      notes: "Currency exchange at the airport (Narita) offers competitive rates. Exchange at least ¥50,000 per adult for the first few days. ATMs in 7-Eleven accept international cards.",
      latitude: 35.7719,
      longitude: 140.3929,
      costLocal: 800,
      localCurrency: "JPY",
    },
    {
      sortOrder: 2,
      time: "09:30",
      activity: "Narita Express (N'EX) to Shinjuku Station — reserved seats, ~90 min ride",
      type: "transport",
      highlight: false,
      bookingRequired: true,
      closedOn: [],
      openingHours: "Trains every 30 min",
      tip: "Book N'EX tickets at the JR counter in arrivals (Green counter). Round-trip is ~¥4,070/adult and comes with a 14-day JR pass discount. Keep your ticket — you need it to exit at Shinjuku. Large luggage goes in the overhead shelf at the end of each carriage.",
      thumbnail: "🚄",
      notes: "The N'EX is the most comfortable way to reach central Tokyo from Narita. Alternatively, the Skyliner goes to Ueno (60 min, ¥2,570) — useful if your hotel is in that direction.",
      latitude: 35.6892,
      longitude: 139.7,
      costLocal: 4070,
      localCurrency: "JPY",
    },
    {
      sortOrder: 3,
      time: "11:00",
      activity: "Hotel check-in, freshen up & rest — drop luggage, shower, change",
      type: "hotel",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "Check-in from 15:00 (early check-in subject to availability — call ahead)",
      tip: "If your room isn't ready at 11 AM, most hotels will hold your luggage for free. Ask the front desk to store bags so you can head out. Many Tokyo hotels have a lounge where you can freshen up even before the room is ready.",
      thumbnail: "🏨",
      notes: "A long international flight deserves at least 1–2 hrs rest before exploring. Don't push too hard on arrival day — the first evening and next morning will feel much better with some recovery time.",
      latitude: null,
      longitude: null,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 4,
      time: "13:00",
      activity: "Lunch at Fuunji Tsukemen, Shinjuku — rich dipping ramen (tsukemen), a Tokyo staple",
      type: "dining",
      highlight: true,
      bookingRequired: false,
      closedOn: [],
      openingHours: "11:00–15:00, 18:00–22:00 (expect queue)",
      tip: "Order at the vending machine outside. Get the 'toku-mori' (large serving) — the broth is divine. Kids can share one bowl. Line forms 10 min before opening. Tamjeed & Vani: the shop has a mild fish-based dipping broth — not suitable. Opt for Tendon Tenya (天丼てんや) nearby for a vegetarian tempura rice bowl instead.",
      thumbnail: "🍜",
      notes: "Tsukemen is cold thick noodles you dip into a hot, concentrated broth — a different experience from regular ramen. At the end, ask the server to add hot water (waari) to your broth to drink as soup.",
      latitude: 35.6896,
      longitude: 139.6994,
      costLocal: 1100,
      localCurrency: "JPY",
    },
    {
      sortOrder: 5,
      time: "15:00",
      activity: "Shinjuku neighbourhood walk — Takashimaya Times Square, Omoide Yokocho alley peek, Kabukicho neon district",
      type: "sightseeing",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "Open all day",
      tip: "Keep it gentle — this is your first afternoon and jet lag will hit around 15:00–17:00. Shinjuku is best explored on foot. Stick to the east side (Isetan, Takashimaya, Flags) for shopping. West side for the Shinjuku Skyscraper district view.",
      thumbnail: "🏙️",
      notes: "Omoide Yokocho ('Memory Lane') is a tiny alley of yakitori stalls — atmospheric even during the day. Kids will love the vending machine density around this area. Don't miss the Godzilla head peeking out above the Toho Cinema building in Kabukicho.",
      latitude: 35.6895,
      longitude: 139.7006,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 6,
      time: "17:30",
      activity: "Tokyo Metropolitan Government Building Observatory — free panoramic view of Tokyo at dusk",
      type: "sightseeing",
      highlight: true,
      bookingRequired: false,
      closedOn: ["Monday"],
      openingHours: "09:00–22:30 (last entry 22:00), closed some Mon",
      tip: "Go up just before sunset (around 17:30 in March) to see the city transform from golden hour to the neon-lit night skyline. North Tower is usually less crowded. Free admission — just take the elevator from the 1F lobby.",
      thumbnail: "🗼",
      notes: "On clear days you can see Mt Fuji to the west. The building is a 10-min walk from Shinjuku Station west exit. Kids love spotting famous landmarks from above — bring the city map and play 'spot the landmark'.",
      latitude: 35.6894,
      longitude: 139.6917,
      costLocal: 0,
      localCurrency: "JPY",
    },
    {
      sortOrder: 7,
      time: "19:30",
      activity: "Dinner at Shinjuku Gyoen area — Sarasvati Indian Restaurant (vegetarian-friendly) or Tenka Ippin ramen",
      type: "dining",
      highlight: false,
      bookingRequired: false,
      closedOn: [],
      openingHours: "18:00–23:00",
      tip: "Sarasvati in Shinjuku has full vegetarian options (paneer, dal, naan) — excellent for Tamjeed & Vani after a long travel day. Tenka Ippin is for the non-vegetarians craving their first proper Tokyo ramen. Both are within a 5-min walk of each other.",
      thumbnail: "🍛",
      notes: "Keep dinner early and light — you've crossed 5.5 time zones and tomorrow is a full day. Aim to be in bed by 22:00 IST equivalent (01:30 JST) to reset your body clock faster.",
      latitude: 35.685,
      longitude: 139.704,
      costLocal: 1500,
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
