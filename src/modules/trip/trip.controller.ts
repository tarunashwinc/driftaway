import fs from "fs";
import path from "path";
import type { FastifyRequest, FastifyReply } from "fastify";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
} from "../../middleware/error-handler.js";
import { s3, S3_BUCKET } from "../../config/s3.js";
import {
  addBookingSchema,
  addChecklistItemSchema,
  addExpenseSchema,
  addMinorSchema,
  aiChatSchema,
  createTripSchema,
  generatePlanSchema,
  inviteTravelerSchema,
  updateBookingSchema,
  updateItineraryItemSchema,
  updateTripSchema,
} from "./trip.schema.js";
import { tripService } from "./trip.service.js";

// ─── Param types ───

interface TripParams {
  id: string;
}

interface TripUserParams {
  id: string;
  userId: string;
}

interface TripItineraryParams {
  id: string;
  dayId: string;
  itemId: string;
}

interface TripBookingParams {
  id: string;
  bookingId: string;
}

interface TripChecklistParams {
  id: string;
  itemId: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

// ─── Helper ───

function getUser(request: FastifyRequest) {
  if (!request.user) {
    throw new UnauthorizedError();
  }
  return request.user;
}

function parsePagination(query: PaginationQuery) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));
  return { page, limit };
}

// ─── Controller ───

export const tripController = {
  async listTrips(
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const { page, limit } = parsePagination(request.query);
    const { trips, total } = await tripService.listTrips(user.userId, page, limit);
    reply.send({
      success: true,
      data: trips,
      meta: { page, limit, total },
    });
  },

  async createTrip(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = createTripSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    const trip = await tripService.createTrip(user.userId, parsed.data);
    reply.status(201).send({ success: true, data: trip });
  },

  async getTripDetail(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const trip = await tripService.getTripDetail(request.params.id, user.userId);
    reply.send({ success: true, data: trip });
  },

  async updateTrip(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = updateTripSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    const trip = await tripService.updateTrip(
      request.params.id,
      user.userId,
      parsed.data,
    );
    reply.send({ success: true, data: trip });
  },

  async deleteTrip(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    await tripService.deleteTrip(request.params.id, user.userId);
    reply.send({ success: true });
  },

  async inviteTraveler(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = inviteTravelerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    await tripService.inviteTraveler(request.params.id, user.userId, parsed.data);
    reply.status(201).send({ success: true, data: { message: "Traveler invited" } });
  },

  async removeTraveler(
    request: FastifyRequest<{ Params: TripUserParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    await tripService.removeTraveler(
      request.params.id,
      user.userId,
      request.params.userId,
    );
    reply.send({ success: true });
  },

  async addMinor(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = addMinorSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    await tripService.addMinor(request.params.id, user.userId, parsed.data.minorId);
    reply.status(201).send({ success: true, data: { message: "Minor added to trip" } });
  },

  async generatePlan(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = generatePlanSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const result = await tripService.generateAIPlan(
      request.params.id,
      user.userId,
      parsed.data.provider,
    );
    reply.send({
      success: true,
      data: { message: "AI plan generated", ...result },
    });
  },

  async aiChat(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = aiChatSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }

    // Verify membership
    await tripService.getItinerary(request.params.id, user.userId);

    reply.send({ success: true, data: { message: "AI chat not yet available" } });
  },

  async getItinerary(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const days = await tripService.getItinerary(request.params.id, user.userId);
    reply.send({ success: true, data: days });
  },

  async updateItineraryItem(
    request: FastifyRequest<{ Params: TripItineraryParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = updateItineraryItemSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    await tripService.updateItineraryItem(
      request.params.id,
      request.params.dayId,
      request.params.itemId,
      user.userId,
      parsed.data,
    );
    reply.send({ success: true, data: { message: "Item updated" } });
  },

  async listBookings(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const bookings = await tripService.listBookings(request.params.id, user.userId);
    reply.send({ success: true, data: bookings });
  },

  async addBooking(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = addBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    const booking = await tripService.addBooking(
      request.params.id,
      user.userId,
      parsed.data,
    );
    reply.status(201).send({ success: true, data: booking });
  },

  async updateBooking(
    request: FastifyRequest<{ Params: TripBookingParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = updateBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    const booking = await tripService.updateBooking(
      request.params.id,
      request.params.bookingId,
      user.userId,
      parsed.data,
    );
    reply.send({ success: true, data: booking });
  },

  async deleteBooking(
    request: FastifyRequest<{ Params: TripBookingParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    await tripService.deleteBooking(
      request.params.id,
      request.params.bookingId,
      user.userId,
    );
    reply.send({ success: true });
  },

  async uploadDocumentForBooking(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const data = await request.file();
    if (!data) throw new ValidationError("No file uploaded");

    const buffer = await data.toBuffer();
    const result = await tripService.createBookingFromDocument(
      request.params.id,
      user.userId,
      buffer,
      data.filename,
      data.mimetype,
    );
    reply.status(201).send({ success: true, data: result });
  },

  async getChecklist(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const items = await tripService.getChecklist(request.params.id, user.userId);
    reply.send({ success: true, data: items });
  },

  async addChecklistItem(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = addChecklistItemSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    const item = await tripService.addChecklistItem(
      request.params.id,
      user.userId,
      parsed.data,
    );
    reply.status(201).send({ success: true, data: item });
  },

  async toggleChecklistItem(
    request: FastifyRequest<{ Params: TripChecklistParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const item = await tripService.toggleChecklistItem(
      request.params.id,
      request.params.itemId,
      user.userId,
    );
    reply.send({ success: true, data: item });
  },

  async addExpense(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const parsed = addExpenseSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
    }
    const expense = await tripService.addExpense(
      request.params.id,
      user.userId,
      parsed.data,
    );
    reply.status(201).send({ success: true, data: expense });
  },

  async getBudgetSummary(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const summary = await tripService.getBudgetSummary(request.params.id, user.userId);
    reply.send({ success: true, data: summary });
  },

  async whatsappSync(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    await tripService.getChecklist(request.params.id, user.userId);
    reply.send({ success: true, data: { message: "WhatsApp sync queued" } });
  },

  async listDocuments(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const docs = await tripService.listTripDocuments(request.params.id, user.userId);
    reply.send({ success: true, data: docs });
  },

  async downloadDocument(
    request: FastifyRequest<{ Params: TripParams & { docId: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const docs = await tripService.listTripDocuments(request.params.id, user.userId);
    const doc = docs.find((d) => d.id === request.params.docId);
    if (!doc) throw new NotFoundError("Document");

    const filename = path.basename(doc.name);
    const disposition = `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;

    // 1. S3-uploaded documents (new path)
    if (doc.s3Key) {
      try {
        const s3Res = await s3.send(
          new GetObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }),
        );
        const chunks: Uint8Array[] = [];
        for await (const chunk of s3Res.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        reply
          .header("Content-Type", doc.mimeType)
          .header("Content-Disposition", disposition)
          .header("Cache-Control", "private, max-age=3600");
        reply.send(buffer);
        return;
      } catch {
        throw new NotFoundError("Document file");
      }
    }

    // 2. Legacy seeded docs stored on disk
    const meta = doc.metadata as Record<string, unknown> | null;
    const rawPath = meta?.localPath as string | undefined;

    const candidatePaths: string[] = [];
    if (rawPath) {
      candidatePaths.push(rawPath);
      candidatePaths.push(rawPath.replace("/Users/tamjeed/dev/driftaway", "/opt/driftaway"));
      candidatePaths.push(path.join(process.cwd(), "Japan_Family_Trip_Docs", path.basename(rawPath)));
    }

    const resolvedPath = candidatePaths.find((p) => fs.existsSync(p));
    if (resolvedPath) {
      const buffer = fs.readFileSync(resolvedPath);
      reply
        .header("Content-Type", doc.mimeType)
        .header("Content-Disposition", disposition)
        .header("Cache-Control", "private, max-age=3600");
      reply.send(buffer);
      return;
    }

    throw new NotFoundError("Document file");
  },

  async uploadDocument(
    request: FastifyRequest<{ Params: TripParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    const data = await request.file();
    if (!data) throw new ValidationError("No file uploaded");

    const buffer = await data.toBuffer();
    const fields = data.fields as Record<string, { value: string } | undefined>;
    const docType = fields.type?.value ?? "other";
    const bookingId = fields.bookingId?.value;

    const doc = await tripService.uploadTripDocument(
      request.params.id,
      user.userId,
      buffer,
      data.filename,
      data.mimetype,
      docType,
      bookingId,
    );
    reply.status(201).send({ success: true, data: doc });
  },

  async deleteDocument(
    request: FastifyRequest<{ Params: TripParams & { docId: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = getUser(request);
    await tripService.deleteTripDocument(
      request.params.id,
      user.userId,
      request.params.docId,
    );
    reply.send({ success: true });
  },
};
