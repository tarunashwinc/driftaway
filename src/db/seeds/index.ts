import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding DriftAway database...\n");

  // ─── Clean existing data ───────────────────────────────────────────────────
  await prisma.auditLog.deleteMany({});
  await prisma.aIConversation.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.transportNote.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.itineraryItem.deleteMany({});
  await prisma.itineraryDay.deleteMany({});
  await prisma.tripMinor.deleteMany({});
  await prisma.tripMember.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.otpCode.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.minor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.brandConfig.deleteMany({});

  console.log("  ✓ Cleaned existing data");

  // ─── Brand Config ──────────────────────────────────────────────────────────
  await prisma.brandConfig.create({
    data: {
      appName: "DriftAway",
      tagline: "plan less. live more.",
      primaryColor: "#FF6B35",
      accentColor: "#06D6A0",
      darkColor: "#1A1A2E",
      surfaceColor: "#F8F7F4",
      fontDisplay: "Outfit",
      fontBody: "Space Grotesk",
    },
  });
  console.log("  ✓ Brand config created");

  // ─── Family 1: Tamjeed's Family ───────────────────────────────────────────

  // Tamjeed (head of family 1, superadmin)
  // Note: phone placeholder — update to real number before going live
  const tamjeed = await prisma.user.create({
    data: {
      phone: "+919100852512",
      name: "Tamjeed",
      dateOfBirth: new Date("1980-01-01"),
      role: "superadmin",
      homeCity: "Hyderabad",
      homeLatitude: 17.385,
      homeLongitude: 78.4867,
      preferences: {
        gender: "Male",
        address: "Hyderabad, Telangana, India",
        diet: "vegetarian",
        allergies: [],
        interests: ["culture", "food", "history"],
        travelStyle: "comfort",
        languages: ["English", "Telugu", "Tamil"],
        accessibility: [],
        transportPref: ["flight", "train"],
        familyGroupId: "tamjeed-family",
        familyRole: "Head",
      },
    },
  });

  // Vani Aparna (wife of Tamjeed)
  const vani = await prisma.user.create({
    data: {
      phone: "+919100602705",
      name: "Vani Aparna",
      dateOfBirth: new Date("1974-05-27"),
      role: "user",
      homeCity: "Hyderabad",
      homeLatitude: 17.385,
      homeLongitude: 78.4867,
      preferences: {
        gender: "Female",
        address: "Hyderabad, Telangana, India",
        diet: "vegetarian",
        allergies: [],
        interests: ["culture", "shopping", "wellness"],
        travelStyle: "comfort",
        languages: ["English", "Telugu", "Tamil", "Hindi"],
        accessibility: [],
        transportPref: ["flight"],
        familyGroupId: "tamjeed-family",
        familyRole: "Spouse",
      },
    },
  });

  // Lakshmi Vibha (elder daughter, 23 yrs old, adult user)
  const vibha = await prisma.user.create({
    data: {
      phone: "+916309010706",
      name: "Lakshmi Vibha",
      dateOfBirth: new Date("2002-06-07"),
      role: "user",
      homeCity: "Bengaluru",
      homeLatitude: 12.9716,
      homeLongitude: 77.5946,
      preferences: {
        gender: "Female",
        address: "Bengaluru, Karnataka, India",
        diet: "none",
        allergies: [],
        interests: ["food", "nightlife", "shopping", "adventure"],
        travelStyle: "backpacker",
        languages: ["English", "Telugu", "Hindi"],
        accessibility: [],
        transportPref: ["flight", "train"],
        familyGroupId: "tamjeed-family",
        familyRole: "Child",
      },
    },
  });

  // Hansika Veda (younger daughter, 17 yrs old, has phone — adult user)
  const hansika = await prisma.user.create({
    data: {
      phone: "+918790511050",
      name: "Hansika Veda",
      dateOfBirth: new Date("2008-05-10"),
      role: "user",
      homeCity: "Hyderabad",
      homeLatitude: 17.385,
      homeLongitude: 78.4867,
      preferences: {
        gender: "Female",
        address: "Hyderabad, Telangana, India",
        diet: "none",
        allergies: [],
        interests: ["beaches", "shopping", "culture"],
        travelStyle: "comfort",
        languages: ["English", "Telugu", "Hindi"],
        accessibility: [],
        transportPref: ["flight"],
        familyGroupId: "tamjeed-family",
        familyRole: "Child",
      },
    },
  });

  console.log("  ✓ Family 1 created: Tamjeed, Vani Aparna, Lakshmi Vibha, Hansika Veda");

  // ─── Family 2: Arun's Family ──────────────────────────────────────────────

  // Arun Palani (head of family 2)
  const arun = await prisma.user.create({
    data: {
      phone: "+919500789387",
      name: "Arun Palani",
      dateOfBirth: new Date("1980-09-29"),
      role: "user",
      homeCity: "Salem",
      homeLatitude: 11.6643,
      homeLongitude: 78.146,
      preferences: {
        gender: "Male",
        address: "Salem, Tamil Nadu, India",
        diet: "none",
        allergies: [],
        interests: ["food", "adventure", "culture", "history"],
        travelStyle: "comfort",
        languages: ["English", "Tamil", "Telugu", "Hindi"],
        accessibility: [],
        transportPref: ["flight", "road_trip"],
        familyGroupId: "arun-family",
        familyRole: "Head",
      },
    },
  });

  // Bathu Arun (wife of Arun)
  const bathu = await prisma.user.create({
    data: {
      phone: "+919500789362",
      name: "Bathu Arun",
      dateOfBirth: new Date("1979-06-04"),
      role: "user",
      homeCity: "Salem",
      homeLatitude: 11.6643,
      homeLongitude: 78.146,
      preferences: {
        gender: "Female",
        address: "Salem, Tamil Nadu, India",
        diet: "none",
        allergies: [],
        interests: ["culture", "shopping", "wellness", "food"],
        travelStyle: "comfort",
        languages: ["English", "Tamil", "Telugu"],
        accessibility: [],
        transportPref: ["flight"],
        familyGroupId: "arun-family",
        familyRole: "Spouse",
      },
    },
  });

  console.log("  ✓ Family 2 created: Arun Palani, Bathu Arun");

  // ─── Minors (Arun's children — no phones) ────────────────────────────────

  const anand = await prisma.minor.create({
    data: {
      name: "Anand Arun",
      dateOfBirth: new Date("2008-10-23"),
      guardianId: arun.id,
      specialNeeds: "[Son]",
      preferences: {
        favActivities: ["Adventure", "Sports", "Technology"],
        dietaryNeeds: "None",
      },
    },
  });

  const arpana = await prisma.minor.create({
    data: {
      name: "Arpana Arun",
      dateOfBirth: new Date("2013-12-30"),
      guardianId: arun.id,
      specialNeeds: "[Daughter]",
      preferences: {
        favActivities: ["Beach", "Drawing", "Animals"],
        dietaryNeeds: "None",
      },
    },
  });

  console.log("  ✓ Minors created: Anand Arun (Son), Arpana Arun (Daughter) under Arun Palani");

  // ─── Joint Trip: Both Families — Bali Adventure ───────────────────────────

  const baliTrip = await prisma.trip.create({
    data: {
      title: "Bali Family Getaway",
      destination: "Bali, Indonesia",
      subDestinations: ["Ubud", "Seminyak", "Nusa Penida", "Uluwatu"],
      startDate: new Date("2026-04-10"),
      endDate: new Date("2026-04-18"),
      currency: "INR",
      budgetTotal: 800000,
      budgetSpent: 187000,
      aiProvider: "openai",
      status: "planning",
      preferences: {
        pace: "Relaxed",
        focusAreas: ["Culture", "Nature", "Food", "Family"],
        avoidCrowds: false,
      },
      bannerConfig: {
        gradient: "linear-gradient(160deg, #06B6D4 0%, #10B981 100%)",
        emoji: "🌴",
      },
      createdById: tamjeed.id,
      isSeed: true,
    },
  });

  // Trip members — all 6 adults from both families
  await prisma.tripMember.createMany({
    data: [
      { tripId: baliTrip.id, userId: tamjeed.id, role: "organizer", startCity: "Hyderabad", startLatitude: 17.385, startLongitude: 78.4867 },
      { tripId: baliTrip.id, userId: vani.id, role: "participant", startCity: "Hyderabad", startLatitude: 17.385, startLongitude: 78.4867 },
      { tripId: baliTrip.id, userId: vibha.id, role: "participant", startCity: "Bengaluru", startLatitude: 12.9716, startLongitude: 77.5946 },
      { tripId: baliTrip.id, userId: hansika.id, role: "participant", startCity: "Hyderabad", startLatitude: 17.385, startLongitude: 78.4867 },
      { tripId: baliTrip.id, userId: arun.id, role: "organizer", startCity: "Salem", startLatitude: 11.6643, startLongitude: 78.146 },
      { tripId: baliTrip.id, userId: bathu.id, role: "participant", startCity: "Salem", startLatitude: 11.6643, startLongitude: 78.146 },
    ],
  });

  // Trip minors
  await prisma.tripMinor.createMany({
    data: [
      { tripId: baliTrip.id, minorId: anand.id },
      { tripId: baliTrip.id, minorId: arpana.id },
    ],
  });

  console.log("  ✓ Bali trip created — 6 adults from 2 families + 2 minors");

  // ─── Bookings ─────────────────────────────────────────────────────────────

  await prisma.booking.createMany({
    data: [
      {
        tripId: baliTrip.id,
        type: "flight",
        status: "confirmed",
        carrier: "IndiGo",
        fromLocation: "HYD",
        toLocation: "DPS",
        departureDate: new Date("2026-04-10"),
        departureTime: "06:15",
        arrivalDate: new Date("2026-04-10"),
        arrivalTime: "14:30",
        confirmationRef: "6E-HYD2026",
        cost: 96000,
        currency: "INR",
        travelers: [tamjeed.id, vani.id, hansika.id],
        details: { baggage: "15kg cabin + 20kg checked", note: "Tamjeed, Vani, Hansika from HYD" },
      },
      {
        tripId: baliTrip.id,
        type: "flight",
        status: "confirmed",
        carrier: "Air India",
        fromLocation: "BLR",
        toLocation: "DPS",
        departureDate: new Date("2026-04-10"),
        departureTime: "08:00",
        arrivalDate: new Date("2026-04-10"),
        arrivalTime: "16:45",
        confirmationRef: "AI-BLR2026",
        cost: 32000,
        currency: "INR",
        travelers: [vibha.id],
        details: { baggage: "15kg cabin + 20kg checked", note: "Lakshmi Vibha from BLR" },
      },
      {
        tripId: baliTrip.id,
        type: "flight",
        status: "confirmed",
        carrier: "SpiceJet",
        fromLocation: "MAA",
        toLocation: "DPS",
        departureDate: new Date("2026-04-10"),
        departureTime: "05:30",
        arrivalDate: new Date("2026-04-10"),
        arrivalTime: "15:00",
        confirmationRef: "SG-MAA2026",
        cost: 104000,
        currency: "INR",
        travelers: [arun.id, bathu.id],
        details: { baggage: "15kg cabin + 20kg checked", note: "Arun, Bathu + 2 minors from MAA" },
      },
      {
        tripId: baliTrip.id,
        type: "hotel",
        status: "confirmed",
        name: "Komaneka at Rasa Sayang",
        toLocation: "Ubud",
        checkIn: new Date("2026-04-10"),
        checkOut: new Date("2026-04-14"),
        confirmationRef: "KOM-2026-8810",
        cost: 120000,
        currency: "INR",
        travelers: [tamjeed.id, vani.id, vibha.id, hansika.id, arun.id, bathu.id],
        details: { roomType: "3× Deluxe Pool Villa", breakfast: true, wifi: true, rooms: 3 },
      },
      {
        tripId: baliTrip.id,
        type: "hotel",
        status: "pending",
        name: "The Mulia Bali",
        toLocation: "Seminyak",
        checkIn: new Date("2026-04-14"),
        checkOut: new Date("2026-04-18"),
        cost: 160000,
        currency: "INR",
        travelers: [tamjeed.id, vani.id, vibha.id, hansika.id, arun.id, bathu.id],
        details: { roomType: "3× Ocean Suite", breakfast: true, rooms: 3 },
      },
    ],
  });

  console.log("  ✓ 5 bookings created (3 flights + 2 hotels)");

  // ─── Itinerary ────────────────────────────────────────────────────────────

  const day1 = await prisma.itineraryDay.create({
    data: {
      tripId: baliTrip.id, dayNumber: 1, date: new Date("2026-04-10"),
      title: "Arrival & Ubud vibes",
    },
  });
  await prisma.itineraryItem.createMany({
    data: [
      { dayId: day1.id, sortOrder: 1, time: "15:00", activity: "Check in at Komaneka at Rasa Sayang", type: "hotel", latitude: -8.5069, longitude: 115.2625, costLocal: 0, localCurrency: "IDR", thumbnail: "🏨", notes: "3 rooms pre-booked. Vegetarian dinner arranged for Tamjeed & Vani." },
      { dayId: day1.id, sortOrder: 2, time: "17:00", activity: "Tegallalang Rice Terraces", type: "sightseeing", latitude: -8.4312, longitude: 115.2792, costLocal: 50000, costConverted: 263, localCurrency: "IDR", thumbnail: "🌾" },
      { dayId: day1.id, sortOrder: 3, time: "19:30", activity: "Welcome dinner at Locavore", type: "dining", latitude: -8.5078, longitude: 115.2634, costLocal: 900000, costConverted: 4737, localCurrency: "IDR", thumbnail: "🍽️", notes: "Vegetarian menu for Tamjeed & Vani. Full menu for others." },
    ],
  });

  const day2 = await prisma.itineraryDay.create({
    data: {
      tripId: baliTrip.id, dayNumber: 2, date: new Date("2026-04-11"),
      title: "Sacred & spiritual",
    },
  });
  await prisma.itineraryItem.createMany({
    data: [
      { dayId: day2.id, sortOrder: 1, time: "06:00", activity: "Sunrise yoga at hotel", type: "wellness", costLocal: 0, localCurrency: "IDR", thumbnail: "🧘", notes: "Complimentary for hotel guests. Kids welcome." },
      { dayId: day2.id, sortOrder: 2, time: "09:00", activity: "Tirta Empul Temple", type: "sightseeing", latitude: -8.4153, longitude: 115.3156, costLocal: 50000, costConverted: 263, localCurrency: "IDR", thumbnail: "⛩️", notes: "Bring sarong. All family members can participate in purification ritual." },
      { dayId: day2.id, sortOrder: 3, time: "13:00", activity: "Lunch at Bebek Bengil (Dirty Duck)", type: "dining", latitude: -8.5034, longitude: 115.2637, costLocal: 180000, costConverted: 947, localCurrency: "IDR", thumbnail: "🦆", notes: "Veg alternatives for Tamjeed & Vani. Kids will enjoy the duck pond garden." },
      { dayId: day2.id, sortOrder: 4, time: "15:00", activity: "Sacred Monkey Forest", type: "sightseeing", latitude: -8.5186, longitude: 115.2588, costLocal: 80000, costConverted: 421, localCurrency: "IDR", thumbnail: "🐒", notes: "⚠️ Secure phones and glasses! Keep Anand (17) and Arpana (12) close.", accessibility: ["kid-friendly"] },
      { dayId: day2.id, sortOrder: 5, time: "19:30", activity: "Kecak Fire Dance at Uluwatu", type: "culture", latitude: -8.8292, longitude: 115.0849, costLocal: 150000, costConverted: 789, localCurrency: "IDR", thumbnail: "🔥", notes: "Sunset + dance performance. Leave Ubud by 17:30." },
    ],
  });

  const day3 = await prisma.itineraryDay.create({
    data: {
      tripId: baliTrip.id, dayNumber: 3, date: new Date("2026-04-12"),
      title: "Nusa Penida expedition",
    },
  });
  await prisma.itineraryItem.createMany({
    data: [
      { dayId: day3.id, sortOrder: 1, time: "07:00", activity: "Speedboat to Nusa Penida from Sanur", type: "transport", latitude: -8.7283, longitude: 115.545, costLocal: 350000, costConverted: 1842, localCurrency: "IDR", thumbnail: "🚤", notes: "30-min rough crossing. Seasickness meds at breakfast! Life jackets for all." },
      { dayId: day3.id, sortOrder: 2, time: "09:30", activity: "Kelingking Beach viewpoint", type: "sightseeing", latitude: -8.7522, longitude: 115.4703, costLocal: 0, localCurrency: "IDR", thumbnail: "🏖️", notes: "View from top only — descent is very steep." },
      { dayId: day3.id, sortOrder: 3, time: "12:00", activity: "Angel's Billabong & Broken Beach", type: "sightseeing", latitude: -8.7372, longitude: 115.5217, costLocal: 0, localCurrency: "IDR", thumbnail: "💎", notes: "Natural infinity pool. Kids can wade in shallow areas at low tide." },
      { dayId: day3.id, sortOrder: 4, time: "13:30", activity: "Lunch at Penida Colada", type: "dining", latitude: -8.7295, longitude: 115.5412, costLocal: 180000, costConverted: 947, localCurrency: "IDR", thumbnail: "🥥", notes: "Beachside. Veg thali for Tamjeed & Vani." },
      { dayId: day3.id, sortOrder: 5, time: "15:00", activity: "Crystal Bay snorkeling + manta rays", type: "adventure", latitude: -8.7167, longitude: 115.4647, costLocal: 200000, costConverted: 1053, localCurrency: "IDR", thumbnail: "🤿", notes: "Manta ray season! Vibha & Hansika can try advanced dive (IDR 800K extra). Anand & Arpana: guide-assisted." },
      { dayId: day3.id, sortOrder: 6, time: "17:30", activity: "Speedboat return to Bali", type: "transport", costLocal: 350000, costConverted: 1842, localCurrency: "IDR", thumbnail: "🚤" },
    ],
  });

  const day4 = await prisma.itineraryDay.create({
    data: {
      tripId: baliTrip.id, dayNumber: 4, date: new Date("2026-04-13"),
      title: "Ubud arts & cooking",
    },
  });
  await prisma.itineraryItem.createMany({
    data: [
      { dayId: day4.id, sortOrder: 1, time: "08:00", activity: "Campuhan Ridge Walk", type: "sightseeing", latitude: -8.5038, longitude: 115.2504, costLocal: 0, localCurrency: "IDR", thumbnail: "🌄", notes: "Easy 2km scenic walk. All family members including Arpana can do it." },
      { dayId: day4.id, sortOrder: 2, time: "10:00", activity: "Ubud Art Market", type: "shopping", latitude: -8.5059, longitude: 115.263, costLocal: 500000, costConverted: 2632, localCurrency: "IDR", thumbnail: "🛍️", notes: "Bargain to 30% of asking price. Ladies will love the batik and silver jewellery." },
      { dayId: day4.id, sortOrder: 3, time: "13:00", activity: "Balinese cooking class", type: "culture", latitude: -8.4567, longitude: 115.2891, costLocal: 450000, costConverted: 2368, localCurrency: "IDR", thumbnail: "👨‍🍳", notes: "Includes market visit. Separate veg class track for Tamjeed & Vani. Kids 10+ welcome — Anand can join." },
      { dayId: day4.id, sortOrder: 4, time: "18:00", activity: "Spa at Komaneka (last night)", type: "wellness", costLocal: 600000, costConverted: 3158, localCurrency: "IDR", thumbnail: "💆", notes: "Book couples sessions for Tamjeed+Vani and Arun+Bathu." },
    ],
  });

  console.log("  ✓ 4-day Bali itinerary created with 18 items");

  // ─── Checklist ────────────────────────────────────────────────────────────

  await prisma.checklistItem.createMany({
    data: [
      // Documents
      { tripId: baliTrip.id, text: "Passports for all 6 adults (6+ months validity)", category: "Documents", sortOrder: 1 },
      { tripId: baliTrip.id, text: "Travel insurance (family policy for all 8)", category: "Documents", sortOrder: 2 },
      { tripId: baliTrip.id, text: "Bali e-VOA applied for all adults ($35 USD each)", category: "Documents", sortOrder: 3, isChecked: true },
      { tripId: baliTrip.id, text: "Hotel confirmation printouts (Komaneka + Mulia)", category: "Documents", sortOrder: 4, isChecked: true },
      { tripId: baliTrip.id, text: "All boarding passes screenshotted", category: "Documents", sortOrder: 5 },
      // Health
      { tripId: baliTrip.id, text: "Typhoid vaccination check for all", category: "Health", sortOrder: 6, isAiGenerated: true },
      { tripId: baliTrip.id, text: "Seasickness tablets for Nusa Penida crossing", category: "Health", sortOrder: 7, isAiGenerated: true },
      { tripId: baliTrip.id, text: "Personal medications packed (7-day supply + buffer)", category: "Health", sortOrder: 8 },
      { tripId: baliTrip.id, text: "First-aid kit: antiseptic, band-aids, ORS packets", category: "Health", sortOrder: 9 },
      // Essentials
      { tripId: baliTrip.id, text: "Sunscreen SPF 50+ (reef-safe) for all", category: "Essentials", sortOrder: 10, isChecked: true },
      { tripId: baliTrip.id, text: "Mosquito repellent (DEET-based)", category: "Essentials", sortOrder: 11 },
      { tripId: baliTrip.id, text: "Reusable water bottles (1 per person)", category: "Essentials", sortOrder: 12 },
      { tripId: baliTrip.id, text: "Universal power adapter (Type C/F plugs)", category: "Essentials", sortOrder: 13 },
      // Clothing
      { tripId: baliTrip.id, text: "Sarongs for all (required for temple entry)", category: "Clothing", sortOrder: 14 },
      { tripId: baliTrip.id, text: "Swimwear + rash guard for snorkeling", category: "Clothing", sortOrder: 15 },
      { tripId: baliTrip.id, text: "Comfortable walking shoes for temple trails", category: "Clothing", sortOrder: 16 },
      { tripId: baliTrip.id, text: "Modest tops/shawls for temple visits", category: "Clothing", sortOrder: 17, isAiGenerated: true },
      // Apps & Finance
      { tripId: baliTrip.id, text: "Grab + Gojek apps installed & payment linked", category: "Apps", sortOrder: 18 },
      { tripId: baliTrip.id, text: "Google Maps offline (Bali, Ubud, Nusa Penida)", category: "Apps", sortOrder: 19 },
      { tripId: baliTrip.id, text: "Wise/Niyo cards loaded for all adults", category: "Finance", sortOrder: 20, isChecked: true },
      { tripId: baliTrip.id, text: "USD $50 cash per adult for e-VOA at airport", category: "Finance", sortOrder: 21 },
      { tripId: baliTrip.id, text: "Small IDR bills for tips, parking & offerings", category: "Finance", sortOrder: 22, isAiGenerated: true },
    ],
  });

  console.log("  ✓ 22 checklist items across 6 categories");

  // ─── Transport Notes ──────────────────────────────────────────────────────

  await prisma.transportNote.createMany({
    data: [
      { tripId: baliTrip.id, icon: "✈️", title: "Flights", detail: "Family 1 (HYD): Tamjeed + Vani + Hansika on IndiGo 6E at 06:15. Vibha joins from BLR on AI at 08:00. Family 2 (MAA): Arun + Bathu + Anand + Arpana on SpiceJet at 05:30. All arrive DPS by 17:00.", sortOrder: 1 },
      { tripId: baliTrip.id, icon: "🛵", title: "Local transport", detail: "Private car hire recommended for our group size (8 pax): ₹3,000-4,000/day for a 12-seater. Grab & Gojek for smaller outings. Scooter for Vibha & Hansika (international license required).", sortOrder: 2 },
      { tripId: baliTrip.id, icon: "💰", title: "Currency", detail: "1 INR ≈ 190 IDR (April 2026). Use Wise/Niyo for best rates. BCA ATMs have lowest fees. Carry IDR 10,000-50,000 notes for temples, parking, warungs.", sortOrder: 3 },
      { tripId: baliTrip.id, icon: "📶", title: "SIM & internet", detail: "Buy Telkomsel tourist SIM at DPS arrivals — 15GB 4G for ~₹500. All 6 adults need SIM or eSIM (Airalo app). Buy at the airport counter — much cheaper than in town.", sortOrder: 4 },
      { tripId: baliTrip.id, icon: "🕐", title: "Time zone", detail: "Bali WITA = IST + 2.5 hours. When it's 7 AM in India → 9:30 AM in Bali. Good time for WhatsApp home is 8-9 PM Bali = 5:30-6:30 PM India.", sortOrder: 5 },
      { tripId: baliTrip.id, icon: "🙏", title: "Cultural etiquette", detail: "Remove footwear before temples. Wear sarong (shoulders + knees covered). Don't step on offerings (canang sari) on the ground. Don't point with index finger — use thumb. Greet with 'Om Swastiastu'.", sortOrder: 6 },
      { tripId: baliTrip.id, icon: "🍽️", title: "Vegetarian note", detail: "Tamjeed & Vani are vegetarian. All restaurant choices have confirmed veg options. Temple food (prasad) is always veg. Remind guides and hotels at every meal.", sortOrder: 7 },
    ],
  });

  console.log("  ✓ 7 transport & destination notes");

  // ─── Reminders ────────────────────────────────────────────────────────────

  await prisma.reminder.createMany({
    data: [
      { tripId: baliTrip.id, scheduledAt: new Date("2026-03-15T09:00:00Z"), message: "🛂 Apply for Bali e-VOA now — all 6 adults need it ($35 USD each). Apply at molina.imigrasi.go.id. Processing 2-3 days.", channel: "whatsapp" },
      { tripId: baliTrip.id, scheduledAt: new Date("2026-03-25T09:00:00Z"), message: "💊 Health check: typhoid vaccination for all. Pick up seasickness meds. Personal medications stocked for 10 days?", channel: "whatsapp" },
      { tripId: baliTrip.id, scheduledAt: new Date("2026-04-03T09:00:00Z"), message: "📋 1 week to go! Check the packing list in DriftAway. Download offline Bali maps. Load Wise cards.", channel: "push" },
      { tripId: baliTrip.id, scheduledAt: new Date("2026-04-09T18:00:00Z"), message: "🧳 Final pack check! Sarongs, sunscreen, adapters, passports, e-VOA confirmation. All 8 packing!", channel: "push" },
      { tripId: baliTrip.id, scheduledAt: new Date("2026-04-10T01:00:00Z"), message: "✈️ Flight day! 🛫 HYD (Tamjeed+Vani+Hansika) at 06:15 → leave home by 03:30. 🛫 BLR (Vibha) at 08:00. 🛫 MAA (Arun+Bathu+kids) at 05:30. Safe travels! 🌴", channel: "whatsapp" },
    ],
  });

  console.log("  ✓ 5 trip reminders scheduled");

  // ─── Second trip: Ooty weekend draft (Family 1 only) ─────────────────────

  const ootyTrip = await prisma.trip.create({
    data: {
      title: "Ooty Family Weekend",
      destination: "Ooty, Tamil Nadu",
      subDestinations: ["Coonoor", "Doddabetta"],
      startDate: new Date("2026-05-23"),
      endDate: new Date("2026-05-25"),
      currency: "INR",
      budgetTotal: 35000,
      aiProvider: "openai",
      status: "draft",
      bannerConfig: {
        gradient: "linear-gradient(160deg, #34D399 0%, #059669 100%)",
        emoji: "🌿",
      },
      createdById: tamjeed.id,
      isSeed: true,
    },
  });

  await prisma.tripMember.createMany({
    data: [
      { tripId: ootyTrip.id, userId: tamjeed.id, role: "organizer", startCity: "Hyderabad" },
      { tripId: ootyTrip.id, userId: vani.id, role: "participant", startCity: "Hyderabad" },
      { tripId: ootyTrip.id, userId: hansika.id, role: "participant", startCity: "Hyderabad" },
    ],
  });

  console.log("  ✓ Ooty weekend draft trip (Family 1 only)");

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log("\n✅ Seed complete!");
  console.log("\n─── Family 1 (Tamjeed) ──────────────────────────────");
  console.log("   Tamjeed (superadmin)    : +919100852512");
  console.log("   Vani Aparna (wife)      : +919100602705");
  console.log("   Lakshmi Vibha (daughter): +916309010706");
  console.log("   Hansika Veda (daughter) : +918790511050");
  console.log("\n─── Family 2 (Arun) ─────────────────────────────────");
  console.log("   Arun Palani             : +919500789387");
  console.log("   Bathu Arun (wife)       : +919500789362");
  console.log("   Anand Arun (minor/son)  : no phone (under Arun)");
  console.log("   Arpana Arun (minor/dau) : no phone (under Arun)");
  console.log("\n─── Trips ───────────────────────────────────────────");
  console.log("   1. Bali Family Getaway (planning) — both families, 6 adults + 2 minors");
  console.log("   2. Ooty Family Weekend (draft)    — Family 1 only");
  console.log("\n─── Login ───────────────────────────────────────────");
  console.log("   Use any of the phone numbers above → receive OTP → login");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
