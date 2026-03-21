import { Worker, Queue } from "bullmq";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

const connection = { url: env.REDIS_URL };
import { getAIProvider } from "../modules/ai/ai.provider.js";
import type { AIGenerateRequest, AIGenerateResponse } from "../modules/ai/ai.provider.js";
import type { AIProvider } from "@prisma/client";

export const AI_GENERATE_QUEUE = "ai-generate";

export interface AIGenerateJobData {
  tripId: string;
  userId: string;
  provider: AIProvider;
}

export const aiGenerateQueue = new Queue<AIGenerateJobData>(AI_GENERATE_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export function startAIGenerateWorker() {
  const worker = new Worker<AIGenerateJobData>(
    AI_GENERATE_QUEUE,
    async (job) => {
      const { tripId, userId: _userId, provider } = job.data;

      // Load trip with all traveler data
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: { include: { user: true } },
          tripMinors: { include: { minor: true } },
          bookings: true,
        },
      });

      if (!trip) throw new Error(`Trip ${tripId} not found`);

      // Build AI request
      const request: AIGenerateRequest = {
        tripId: trip.id,
        provider,
        destination: trip.destination,
        subDestinations: trip.subDestinations,
        startDate: trip.startDate.toISOString().split("T")[0] ?? "",
        endDate: trip.endDate.toISOString().split("T")[0] ?? "",
        currency: trip.currency,
        travelers: trip.members.map((m) => {
          const prefs = m.user.preferences as Record<string, unknown> | null;
          return {
            name: m.user.name,
            age: m.user.dateOfBirth
              ? Math.floor(
                  (Date.now() - m.user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
                )
              : 30,
            dietPref: prefs?.diet as string | undefined,
            allergies: prefs?.allergies as string | undefined,
            interests: prefs?.interests as string[] | undefined,
            travelStyle: prefs?.travelStyle as string | undefined,
            startCity: m.startCity ?? "unknown",
            accessibilityNeeds: prefs?.accessibility as string[] | undefined,
          };
        }),
        minors: trip.tripMinors.map((tm) => {
          const prefs = tm.minor.preferences as Record<string, unknown> | null;
          return {
            name: tm.minor.name,
            age: Math.floor(
              (Date.now() - tm.minor.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
            ),
            specialNeeds: tm.minor.specialNeeds ?? undefined,
            favActivities: prefs?.favActivities as string[] | undefined,
          };
        }),
        preferences: (trip.preferences as Record<string, unknown> | null) ?? {},
        existingBookings: trip.bookings.map((b) => ({
          type: b.type,
          name: b.name ?? undefined,
          date: b.departureDate?.toISOString().split("T")[0],
          time: b.departureTime ?? undefined,
          location: b.fromLocation ?? undefined,
        })),
        budget: trip.budgetTotal ? Number(trip.budgetTotal) : undefined,
      };

      // Call AI provider
      const aiProvider = getAIProvider(provider);
      const response: AIGenerateResponse = await aiProvider.generate(request);

      // Save AI conversation record
      await prisma.aIConversation.create({
        data: {
          tripId,
          provider,
          messages: [{ role: "assistant", content: "Generated travel plan" }],
          tokensUsed: response.tokensUsed,
        },
      });

      // Save itinerary days and items
      await prisma.$transaction(async (tx) => {
        // Clear existing AI-generated itinerary
        await tx.itineraryDay.deleteMany({ where: { tripId } });

        // Create new days with items
        for (const day of response.days) {
          const itDay = await tx.itineraryDay.create({
            data: {
              tripId,
              dayNumber: day.dayNumber,
              date: new Date(day.date),
              title: day.title,
            },
          });

          for (let i = 0; i < day.items.length; i++) {
            const item = day.items[i];
            if (!item) continue;
            const validTypes = [
              "hotel",
              "sightseeing",
              "dining",
              "transport",
              "adventure",
              "culture",
              "wellness",
              "shopping",
              "other",
            ] as const;
            type ItemType = (typeof validTypes)[number];
            const itemType: ItemType = validTypes.includes(item.type as ItemType)
              ? (item.type as ItemType)
              : "other";
            await tx.itineraryItem.create({
              data: {
                dayId: itDay.id,
                sortOrder: i,
                time: item.time,
                activity: item.activity,
                type: itemType,
                latitude: item.latitude,
                longitude: item.longitude,
                costLocal: item.costLocal,
                localCurrency: item.localCurrency,
                thumbnail: item.thumbnail,
                notes: item.notes,
                accessibility: item.accessibility,
                participants: [],
              },
            });
          }
        }

        // Save checklist items
        for (let i = 0; i < response.checklist.length; i++) {
          const ci = response.checklist[i];
          if (!ci) continue;
          await tx.checklistItem.create({
            data: {
              tripId,
              text: ci.text,
              category: ci.category,
              isAiGenerated: true,
              sortOrder: i,
            },
          });
        }

        // Save transport notes
        for (let i = 0; i < response.transportNotes.length; i++) {
          const tn = response.transportNotes[i];
          if (!tn) continue;
          await tx.transportNote.create({
            data: {
              tripId,
              icon: tn.icon,
              title: tn.title,
              detail: tn.detail,
              sortOrder: i,
            },
          });
        }
      });

      return { success: true, tripId };
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`AI plan generated for trip ${job.data.tripId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`AI plan generation failed for trip ${job?.data.tripId}:`, err);
  });

  return worker;
}
