import { Prisma } from "@prisma/client";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../config/prisma.js";
import { s3, S3_BUCKET } from "../../config/s3.js";
import { env } from "../../config/env.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../middleware/error-handler.js";
import type {
  AddBookingInput,
  AddChecklistItemInput,
  AddExpenseInput,
  CreateTripInput,
  InviteTravelerInput,
  UpdateBookingInput,
  UpdateItineraryItemInput,
  UpdateTripInput,
} from "./trip.schema.js";
import type {
  BookingSummary,
  BudgetSummary,
  ChecklistItemSummary,
  ExpenseSummary,
  ItineraryDaySummary,
  TripDetail,
  TripSummary,
} from "./trip.types.js";
import type { TripRole } from "@prisma/client";

// ─── Helpers ───

async function getTripMembership(
  tripId: string,
  userId: string,
): Promise<{ role: TripRole } | null> {
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: { role: true },
  });
  return member;
}

async function requireMember(tripId: string, userId: string): Promise<TripRole> {
  const membership = await getTripMembership(tripId, userId);
  if (!membership) {
    throw new ForbiddenError("You are not a member of this trip");
  }
  return membership.role;
}

async function requireOrganizer(tripId: string, userId: string): Promise<void> {
  const role = await requireMember(tripId, userId);
  if (role !== "organizer") {
    throw new ForbiddenError("Only organizers can perform this action");
  }
}

async function requireTrip(tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, deletedAt: null },
  });
  if (!trip) {
    throw new NotFoundError("Trip");
  }
  return trip;
}

// ─── Serialization helpers ───

function toNumber(value: { toNumber(): number } | null | undefined): number | null {
  if (value == null) return null;
  return value.toNumber();
}

function toNumberOrZero(value: { toNumber(): number } | null | undefined): number {
  if (value == null) return 0;
  return value.toNumber();
}

// ─── Trip Service ───

export const tripService = {
  // List trips where user is a member, paginated
  async listTrips(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ trips: TripSummary[]; total: number }> {
    const skip = (page - 1) * limit;

    const [memberships, total] = await Promise.all([
      prisma.tripMember.findMany({
        where: {
          userId,
          trip: { deletedAt: null },
        },
        skip,
        take: limit,
        orderBy: { trip: { updatedAt: "desc" } },
        include: {
          trip: {
            include: {
              _count: { select: { members: true, tripMinors: true } },
              members: {
                take: 5,
                include: {
                  user: { select: { id: true, name: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      }),
      prisma.tripMember.count({
        where: { userId, trip: { deletedAt: null } },
      }),
    ]);

    const trips: TripSummary[] = memberships.map((m) => ({
      id: m.trip.id,
      title: m.trip.title,
      destination: m.trip.destination,
      subDestinations: m.trip.subDestinations,
      startDate: m.trip.startDate,
      endDate: m.trip.endDate,
      currency: m.trip.currency,
      budgetTotal: toNumber(m.trip.budgetTotal),
      budgetSpent: toNumberOrZero(m.trip.budgetSpent),
      aiProvider: m.trip.aiProvider,
      status: m.trip.status,
      bannerConfig: (m.trip.bannerConfig as Record<string, unknown> | null) ?? null,
      memberCount: m.trip._count.members,
      minorCount: m.trip._count.tripMinors,
      members: m.trip.members.map((tm) => ({
        id: tm.id,
        userId: tm.userId,
        role: tm.role,
        user: { id: tm.user.id, name: tm.user.name, avatarUrl: tm.user.avatarUrl },
      })),
      myRole: m.role,
      createdAt: m.trip.createdAt,
      updatedAt: m.trip.updatedAt,
    }));

    return { trips, total };
  },

  // Create trip + add creator as organizer
  async createTrip(userId: string, data: CreateTripInput): Promise<TripDetail> {
    const trip = await prisma.trip.create({
      data: {
        title: data.title,
        destination: data.destination,
        subDestinations: data.subDestinations,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        currency: data.currency,
        budgetTotal: data.budgetTotal ?? null,
        aiProvider: data.aiProvider,
        preferences: (data.preferences ?? undefined) as Prisma.InputJsonValue | undefined,
        bannerConfig: (data.bannerConfig ?? undefined) as Prisma.InputJsonValue | undefined,
        createdById: userId,
        members: {
          create: {
            userId,
            role: "organizer",
            startCity: data.startCity ?? null,
          },
        },
      },
    });

    return tripService.getTripDetail(trip.id, userId);
  },

  // Get full trip detail
  async getTripDetail(tripId: string, userId: string): Promise<TripDetail> {
    await requireMember(tripId, userId);

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: {
        _count: { select: { tripMinors: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, avatarUrl: true },
            },
          },
        },
        itineraryDays: {
          orderBy: { dayNumber: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        bookings: {
          orderBy: [{ departureDate: "asc" }, { checkIn: "asc" }],
        },
        checklistItems: {
          orderBy: { sortOrder: "asc" },
        },
        expenses: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true } } },
        },
        transportNotes: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    const itineraryDays: ItineraryDaySummary[] = trip.itineraryDays.map((day) => ({
      id: day.id,
      tripId: day.tripId,
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title,
      createdAt: day.createdAt,
      updatedAt: day.updatedAt,
      items: day.items.map((item) => ({
        id: item.id,
        dayId: item.dayId,
        sortOrder: item.sortOrder,
        time: item.time,
        activity: item.activity,
        type: item.type,
        latitude: item.latitude,
        longitude: item.longitude,
        costLocal: toNumber(item.costLocal),
        costConverted: toNumber(item.costConverted),
        localCurrency: item.localCurrency,
        thumbnail: item.thumbnail,
        notes: item.notes,
        bookingId: item.bookingId,
        participants: item.participants,
        accessibility: item.accessibility,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    }));

    const bookings: BookingSummary[] = trip.bookings.map((b) => ({
      id: b.id,
      tripId: b.tripId,
      type: b.type,
      status: b.status,
      carrier: b.carrier,
      name: b.name,
      fromLocation: b.fromLocation,
      toLocation: b.toLocation,
      departureDate: b.departureDate,
      departureTime: b.departureTime,
      arrivalDate: b.arrivalDate,
      arrivalTime: b.arrivalTime,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      confirmationRef: b.confirmationRef,
      cost: toNumber(b.cost),
      currency: b.currency,
      travelers: b.travelers,
      details: (b.details as Record<string, unknown> | null) ?? null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    const checklistItems: ChecklistItemSummary[] = trip.checklistItems.map((c) => ({
      id: c.id,
      tripId: c.tripId,
      text: c.text,
      category: c.category,
      isChecked: c.isChecked,
      assignedTo: c.assignedTo,
      isAiGenerated: c.isAiGenerated,
      sortOrder: c.sortOrder,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    const expenses: ExpenseSummary[] = trip.expenses.map((e) => ({
      id: e.id,
      tripId: e.tripId,
      userId: e.userId,
      amount: toNumberOrZero(e.amount),
      currency: e.currency,
      category: e.category,
      description: e.description,
      receiptUrl: e.receiptUrl,
      isShared: e.isShared,
      splitWith: e.splitWith,
      createdAt: e.createdAt,
    }));

    return {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      subDestinations: trip.subDestinations,
      startDate: trip.startDate,
      endDate: trip.endDate,
      currency: trip.currency,
      budgetTotal: toNumber(trip.budgetTotal),
      budgetSpent: toNumberOrZero(trip.budgetSpent),
      aiProvider: trip.aiProvider,
      status: trip.status,
      memberCount: trip.members.length,
      minorCount: trip._count.tripMinors,
      preferences: (trip.preferences as Record<string, unknown> | null) ?? null,
      bannerConfig: (trip.bannerConfig as Record<string, unknown> | null) ?? null,
      whatsappGroupId: trip.whatsappGroupId,
      createdById: trip.createdById,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      members: trip.members.map((m) => ({
        id: m.id,
        tripId: m.tripId,
        userId: m.userId,
        role: m.role,
        startCity: m.startCity,
        joinedAt: m.joinedAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          phone: m.user.phone,
          avatarUrl: m.user.avatarUrl,
        },
      })),
      itineraryDays,
      bookings,
      checklistItems,
      expenses,
      transportNotes: trip.transportNotes.map((t) => ({
        id: t.id,
        tripId: t.tripId,
        icon: t.icon,
        title: t.title,
        detail: t.detail,
        sortOrder: t.sortOrder,
        createdAt: t.createdAt,
      })),
    };
  },

  // Update trip metadata (organizer only)
  async updateTrip(
    tripId: string,
    userId: string,
    data: UpdateTripInput,
  ): Promise<TripDetail> {
    await requireOrganizer(tripId, userId);
    await requireTrip(tripId);

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.destination !== undefined && { destination: data.destination }),
        ...(data.subDestinations !== undefined && {
          subDestinations: data.subDestinations,
        }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.budgetTotal !== undefined && { budgetTotal: data.budgetTotal }),
        ...(data.preferences !== undefined && { preferences: data.preferences }),
        ...(data.bannerConfig !== undefined && { bannerConfig: data.bannerConfig }),
      },
    });

    return tripService.getTripDetail(tripId, userId);
  },

  // Soft delete trip (organizer only)
  async deleteTrip(tripId: string, userId: string): Promise<void> {
    await requireOrganizer(tripId, userId);
    await requireTrip(tripId);

    await prisma.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
    });
  },

  // Invite traveler by phone
  async inviteTraveler(
    tripId: string,
    organizerId: string,
    data: InviteTravelerInput,
  ): Promise<void> {
    await requireOrganizer(tripId, organizerId);
    await requireTrip(tripId);

    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError(
        `No user found with phone ${data.phone}. They must sign up first.`,
      );
    }

    const existing = await getTripMembership(tripId, user.id);
    if (existing) {
      throw new ConflictError("User is already a member of this trip");
    }

    await prisma.tripMember.create({
      data: {
        tripId,
        userId: user.id,
        role: data.role,
        startCity: data.startCity ?? null,
      },
    });
  },

  // Remove traveler from trip (organizer only, cannot remove themselves)
  async removeTraveler(
    tripId: string,
    organizerId: string,
    targetUserId: string,
  ): Promise<void> {
    await requireOrganizer(tripId, organizerId);
    await requireTrip(tripId);

    if (organizerId === targetUserId) {
      throw new ForbiddenError("Organizer cannot remove themselves from the trip");
    }

    const membership = await getTripMembership(tripId, targetUserId);
    if (!membership) {
      throw new NotFoundError("Trip member");
    }

    await prisma.tripMember.delete({
      where: { tripId_userId: { tripId, userId: targetUserId } },
    });
  },

  // Add minor to trip (guardian must be a trip member)
  async addMinor(tripId: string, userId: string, minorId: string): Promise<void> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    // Verify minor belongs to the requesting user (as guardian)
    const minor = await prisma.minor.findFirst({
      where: { id: minorId, guardianId: userId },
    });
    if (!minor) {
      throw new NotFoundError("Minor (must be your dependent)");
    }

    const existing = await prisma.tripMinor.findUnique({
      where: { tripId_minorId: { tripId, minorId } },
    });
    if (existing) {
      throw new ConflictError("Minor is already added to this trip");
    }

    await prisma.tripMinor.create({
      data: { tripId, minorId },
    });
  },

  // Get itinerary days with items
  async getItinerary(tripId: string, userId: string): Promise<ItineraryDaySummary[]> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const days = await prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: { dayNumber: "asc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return days.map((day) => ({
      id: day.id,
      tripId: day.tripId,
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title,
      summary: day.summary,
      accommodation: day.accommodation,
      createdAt: day.createdAt,
      updatedAt: day.updatedAt,
      items: day.items.map((item) => ({
        id: item.id,
        dayId: item.dayId,
        sortOrder: item.sortOrder,
        time: item.time,
        activity: item.activity,
        type: item.type,
        highlight: item.highlight,
        bookingRequired: item.bookingRequired,
        closedOn: item.closedOn,
        openingHours: item.openingHours,
        tip: item.tip,
        latitude: item.latitude,
        longitude: item.longitude,
        costLocal: toNumber(item.costLocal),
        costConverted: toNumber(item.costConverted),
        localCurrency: item.localCurrency,
        thumbnail: item.thumbnail,
        notes: item.notes,
        bookingId: item.bookingId,
        participants: item.participants,
        accessibility: item.accessibility,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    }));
  },

  // Update a single itinerary item
  async updateItineraryItem(
    tripId: string,
    dayId: string,
    itemId: string,
    userId: string,
    data: UpdateItineraryItemInput,
  ): Promise<void> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    // Verify the day belongs to this trip
    const day = await prisma.itineraryDay.findFirst({
      where: { id: dayId, tripId },
    });
    if (!day) {
      throw new NotFoundError("Itinerary day");
    }

    // Verify the item belongs to this day
    const item = await prisma.itineraryItem.findFirst({
      where: { id: itemId, dayId },
    });
    if (!item) {
      throw new NotFoundError("Itinerary item");
    }

    await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(data.time !== undefined && { time: data.time }),
        ...(data.activity !== undefined && { activity: data.activity }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
        ...(data.costLocal !== undefined && { costLocal: data.costLocal }),
        ...(data.localCurrency !== undefined && { localCurrency: data.localCurrency }),
      },
    });
  },

  // List bookings for a trip
  async listBookings(tripId: string, userId: string): Promise<BookingSummary[]> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const bookings = await prisma.booking.findMany({
      where: { tripId },
      orderBy: [{ departureDate: "asc" }, { checkIn: "asc" }],
    });

    return bookings.map((b) => ({
      id: b.id,
      tripId: b.tripId,
      type: b.type,
      status: b.status,
      carrier: b.carrier,
      name: b.name,
      fromLocation: b.fromLocation,
      toLocation: b.toLocation,
      departureDate: b.departureDate,
      departureTime: b.departureTime,
      arrivalDate: b.arrivalDate,
      arrivalTime: b.arrivalTime,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      confirmationRef: b.confirmationRef,
      cost: toNumber(b.cost),
      currency: b.currency,
      travelers: b.travelers,
      details: (b.details as Record<string, unknown> | null) ?? null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  },

  // Add booking to trip
  async addBooking(
    tripId: string,
    userId: string,
    data: AddBookingInput,
  ): Promise<BookingSummary> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const booking = await prisma.booking.create({
      data: {
        tripId,
        type: data.type,
        status: data.status,
        carrier: data.carrier ?? null,
        name: data.name ?? null,
        fromLocation: data.fromLocation ?? null,
        toLocation: data.toLocation ?? null,
        departureDate: data.departureDate ? new Date(data.departureDate) : null,
        departureTime: data.departureTime ?? null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        arrivalTime: data.arrivalTime ?? null,
        checkIn: data.checkIn ? new Date(data.checkIn) : null,
        checkOut: data.checkOut ? new Date(data.checkOut) : null,
        confirmationRef: data.confirmationRef ?? null,
        cost: data.cost ?? null,
        currency: data.currency ?? null,
        travelers: data.travelers,
        details: (data.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    return {
      id: booking.id,
      tripId: booking.tripId,
      type: booking.type,
      status: booking.status,
      carrier: booking.carrier,
      name: booking.name,
      fromLocation: booking.fromLocation,
      toLocation: booking.toLocation,
      departureDate: booking.departureDate,
      departureTime: booking.departureTime,
      arrivalDate: booking.arrivalDate,
      arrivalTime: booking.arrivalTime,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      confirmationRef: booking.confirmationRef,
      cost: toNumber(booking.cost),
      currency: booking.currency,
      travelers: booking.travelers,
      details: (booking.details as Record<string, unknown> | null) ?? null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  },

  // Update booking
  async updateBooking(
    tripId: string,
    bookingId: string,
    userId: string,
    data: UpdateBookingInput,
  ): Promise<BookingSummary> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const existing = await prisma.booking.findFirst({
      where: { id: bookingId, tripId },
    });
    if (!existing) {
      throw new NotFoundError("Booking");
    }

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.carrier !== undefined && { carrier: data.carrier }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.fromLocation !== undefined && { fromLocation: data.fromLocation }),
        ...(data.toLocation !== undefined && { toLocation: data.toLocation }),
        ...(data.departureDate !== undefined && {
          departureDate: data.departureDate ? new Date(data.departureDate) : null,
        }),
        ...(data.departureTime !== undefined && { departureTime: data.departureTime }),
        ...(data.arrivalDate !== undefined && {
          arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        }),
        ...(data.arrivalTime !== undefined && { arrivalTime: data.arrivalTime }),
        ...(data.checkIn !== undefined && {
          checkIn: data.checkIn ? new Date(data.checkIn) : null,
        }),
        ...(data.checkOut !== undefined && {
          checkOut: data.checkOut ? new Date(data.checkOut) : null,
        }),
        ...(data.confirmationRef !== undefined && {
          confirmationRef: data.confirmationRef,
        }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.travelers !== undefined && { travelers: data.travelers }),
        ...(data.details !== undefined && { details: data.details as Prisma.InputJsonValue }),
      },
    });

    return {
      id: booking.id,
      tripId: booking.tripId,
      type: booking.type,
      status: booking.status,
      carrier: booking.carrier,
      name: booking.name,
      fromLocation: booking.fromLocation,
      toLocation: booking.toLocation,
      departureDate: booking.departureDate,
      departureTime: booking.departureTime,
      arrivalDate: booking.arrivalDate,
      arrivalTime: booking.arrivalTime,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      confirmationRef: booking.confirmationRef,
      cost: toNumber(booking.cost),
      currency: booking.currency,
      travelers: booking.travelers,
      details: (booking.details as Record<string, unknown> | null) ?? null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  },

  // Get checklist items
  async getChecklist(tripId: string, userId: string): Promise<ChecklistItemSummary[]> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const items = await prisma.checklistItem.findMany({
      where: { tripId },
      orderBy: { sortOrder: "asc" },
    });

    return items.map((c) => ({
      id: c.id,
      tripId: c.tripId,
      text: c.text,
      category: c.category,
      isChecked: c.isChecked,
      assignedTo: c.assignedTo,
      isAiGenerated: c.isAiGenerated,
      sortOrder: c.sortOrder,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },

  // Add checklist item
  async addChecklistItem(
    tripId: string,
    userId: string,
    data: AddChecklistItemInput,
  ): Promise<ChecklistItemSummary> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    // Get max sort order
    const maxSortOrder = await prisma.checklistItem.aggregate({
      where: { tripId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const item = await prisma.checklistItem.create({
      data: {
        tripId,
        text: data.text,
        category: data.category,
        assignedTo: data.assignedTo ?? null,
        sortOrder,
        isAiGenerated: false,
      },
    });

    return {
      id: item.id,
      tripId: item.tripId,
      text: item.text,
      category: item.category,
      isChecked: item.isChecked,
      assignedTo: item.assignedTo,
      isAiGenerated: item.isAiGenerated,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },

  // Toggle checklist item
  async toggleChecklistItem(
    tripId: string,
    itemId: string,
    userId: string,
  ): Promise<ChecklistItemSummary> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const item = await prisma.checklistItem.findFirst({
      where: { id: itemId, tripId },
    });
    if (!item) {
      throw new NotFoundError("Checklist item");
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isChecked: !item.isChecked },
    });

    return {
      id: updated.id,
      tripId: updated.tripId,
      text: updated.text,
      category: updated.category,
      isChecked: updated.isChecked,
      assignedTo: updated.assignedTo,
      isAiGenerated: updated.isAiGenerated,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  // Add expense
  async addExpense(
    tripId: string,
    userId: string,
    data: AddExpenseInput,
  ): Promise<ExpenseSummary> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const expense = await prisma.expense.create({
      data: {
        tripId,
        userId,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        description: data.description ?? null,
        isShared: data.isShared,
        splitWith: data.splitWith,
      },
    });

    // Update budgetSpent on trip (in same currency only — simplified for MVP)
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        budgetSpent: {
          increment: data.amount,
        },
      },
    });

    return {
      id: expense.id,
      tripId: expense.tripId,
      userId: expense.userId,
      amount: toNumberOrZero(expense.amount),
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
      receiptUrl: expense.receiptUrl,
      isShared: expense.isShared,
      splitWith: expense.splitWith,
      createdAt: expense.createdAt,
    };
  },

  // Get budget summary
  async getBudgetSummary(tripId: string, userId: string): Promise<BudgetSummary> {
    await requireMember(tripId, userId);
    const trip = await requireTrip(tripId);

    const expenses = await prisma.expense.findMany({
      where: { tripId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Aggregate by category
    const categoryMap = new Map<string, number>();
    for (const expense of expenses) {
      const existing = categoryMap.get(expense.category) ?? 0;
      categoryMap.set(expense.category, existing + toNumberOrZero(expense.amount));
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, total]) => ({
      category,
      total,
    }));

    // Aggregate by member
    const memberMap = new Map<string, { name: string; total: number }>();
    for (const expense of expenses) {
      const existing = memberMap.get(expense.userId);
      if (existing) {
        existing.total += toNumberOrZero(expense.amount);
      } else {
        memberMap.set(expense.userId, {
          name: expense.user.name,
          total: toNumberOrZero(expense.amount),
        });
      }
    }
    const memberSplit = Array.from(memberMap.entries()).map(([uid, data]) => ({
      userId: uid,
      name: data.name,
      total: data.total,
    }));

    const budgetTotal = toNumber(trip.budgetTotal);
    const budgetSpent = toNumberOrZero(trip.budgetSpent);
    const remaining = budgetTotal !== null ? budgetTotal - budgetSpent : null;

    return {
      budgetTotal,
      budgetSpent,
      remaining,
      currency: trip.currency,
      byCategory,
      memberSplit,
    };
  },

  // Generate AI itinerary plan and persist to DB
  async generateAIPlan(tripId: string, userId: string, providerOverride?: string) {
    await requireMember(tripId, userId);

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, dateOfBirth: true, preferences: true } },
          },
        },
        tripMinors: { include: { minor: true } },
        bookings: { orderBy: [{ departureDate: "asc" }, { checkIn: "asc" }] },
      },
    });
    if (!trip) throw new NotFoundError("Trip");

    const { getAIProvider } = await import("../ai/ai.provider.js");
    const provider = getAIProvider(
      (providerOverride as import("@prisma/client").AIProvider | undefined) ?? trip.aiProvider,
    );

    const now = new Date();
    function calcAge(dob: Date | null): number {
      if (!dob) return 30;
      return Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    }

    const travelers = trip.members.map((m) => {
      const prefs = (m.user.preferences ?? {}) as Record<string, unknown>;
      return {
        name: m.user.name,
        age: calcAge(m.user.dateOfBirth),
        dietPref: (prefs.diet as string | undefined),
        allergies: (prefs.allergies as string | undefined),
        interests: (prefs.interests as string[] | undefined),
        travelStyle: (prefs.travelStyle as string | undefined),
        startCity: m.startCity ?? trip.destination,
        accessibilityNeeds: (prefs.accessibility as string[] | undefined),
      };
    });

    const minors = trip.tripMinors.map((tm) => {
      const prefs = (tm.minor.preferences ?? {}) as Record<string, unknown>;
      return {
        name: tm.minor.name,
        age: calcAge(tm.minor.dateOfBirth),
        specialNeeds: tm.minor.specialNeeds ?? undefined,
        favActivities: (prefs.favActivities as string[] | undefined),
      };
    });

    const existingBookings = trip.bookings.map((b) => ({
      type: b.type,
      name: b.name ?? undefined,
      confirmationRef: b.confirmationRef ?? undefined,
      date: b.departureDate?.toISOString().split("T")[0] ?? b.checkIn?.toISOString().split("T")[0],
      time: b.departureTime ?? undefined,
      arrivalDate: b.arrivalDate?.toISOString().split("T")[0] ?? undefined,
      arrivalTime: b.arrivalTime ?? undefined,
      location:
        b.fromLocation && b.toLocation
          ? `${b.fromLocation} → ${b.toLocation}`
          : (b.fromLocation ?? b.toLocation ?? b.name ?? undefined),
      cost: b.cost ? Number(b.cost) : undefined,
    }));

    const tripPrefs = (trip.preferences ?? {}) as Record<string, unknown>;

    const aiResponse = await provider.generate({
      tripId,
      provider: trip.aiProvider,
      destination: trip.destination,
      subDestinations: trip.subDestinations,
      startDate: trip.startDate.toISOString().split("T")[0]!,
      endDate: trip.endDate.toISOString().split("T")[0]!,
      currency: trip.currency,
      travelers,
      minors,
      preferences: {
        pace: tripPrefs.pace as string | undefined,
        focusAreas: tripPrefs.focusAreas as string[] | undefined,
        avoidCrowds: tripPrefs.avoidCrowds as boolean | undefined,
      },
      wishlist: (tripPrefs.wishlist as string[] | undefined) ?? [],
      placesToVisit: (tripPrefs.placesToVisit as string[] | undefined) ?? [],
      notes: (tripPrefs.notes as string | undefined) ?? undefined,
      existingBookings,
      budget: trip.budgetTotal ? Number(trip.budgetTotal) : undefined,
    });

    const VALID_ACTIVITY_TYPES = new Set([
      "hotel", "sightseeing", "dining", "transport", "adventure",
      "culture", "wellness", "shopping", "other",
    ]);
    function toActivityType(raw: string): import("@prisma/client").ActivityType {
      return (VALID_ACTIVITY_TYPES.has(raw) ? raw : "other") as import("@prisma/client").ActivityType;
    }

    // Persist: clear existing days, then insert new ones
    await prisma.$transaction(async (tx) => {
      await tx.itineraryDay.deleteMany({ where: { tripId } });
      await tx.checklistItem.deleteMany({ where: { tripId } });
      await tx.transportNote.deleteMany({ where: { tripId } });

      for (const day of aiResponse.days) {
        await tx.itineraryDay.create({
          data: {
            tripId,
            dayNumber: day.dayNumber,
            date: new Date(day.date),
            title: day.title,
            summary: day.summary || null,
            accommodation: day.accommodation || null,
            items: {
              create: day.items.map((item, idx) => ({
                sortOrder: idx,
                time: item.time,
                activity: item.activity,
                type: toActivityType(item.type),
                highlight: item.highlight ?? false,
                bookingRequired: item.bookingRequired ?? false,
                closedOn: item.closedOn ?? [],
                openingHours: item.openingHours ?? null,
                tip: item.tip ?? null,
                latitude: item.latitude ?? null,
                longitude: item.longitude ?? null,
                costLocal: item.costLocal ?? null,
                localCurrency: item.localCurrency ?? null,
                thumbnail: item.thumbnail ?? null,
                notes: item.notes ?? null,
                accessibility: item.accessibility ?? [],
              })),
            },
          },
        });
      }

      for (const [idx, item] of aiResponse.checklist.entries()) {
        await tx.checklistItem.create({
          data: {
            tripId,
            text: item.text,
            category: item.category,
            sortOrder: idx,
          },
        });
      }

      for (const [idx, note] of aiResponse.transportNotes.entries()) {
        await tx.transportNote.create({
          data: {
            tripId,
            icon: note.icon,
            title: note.title,
            detail: note.detail,
            sortOrder: idx,
          },
        });
      }
    });

    return { daysGenerated: aiResponse.days.length, tokensUsed: aiResponse.tokensUsed };
  },

  // Delete a booking and all its associated documents
  async deleteBooking(tripId: string, bookingId: string, userId: string) {
    await requireMember(tripId, userId);

    const booking = await prisma.booking.findFirst({ where: { id: bookingId, tripId } });
    if (!booking) throw new NotFoundError("Booking");

    // Delete associated documents (those with this bookingId in metadata)
    const allDocs = await prisma.document.findMany({ where: { tripId } });
    const bookingDocs = allDocs.filter((d) => {
      const meta = d.metadata as Record<string, unknown> | null;
      return meta?.bookingId === bookingId;
    });
    for (const doc of bookingDocs) {
      if (doc.s3Key) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }));
        } catch {
          // best-effort S3 delete
        }
      }
      await prisma.document.delete({ where: { id: doc.id } });
    }

    await prisma.booking.delete({ where: { id: bookingId } });
  },

  // Parse a travel document with AI and create a booking from it
  async createBookingFromDocument(
    tripId: string,
    userId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ booking: BookingSummary; documentId: string }> {
    await requireMember(tripId, userId);
    await requireTrip(tripId);

    const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new ValidationError("Only PDF, JPEG, PNG or WebP files are allowed");
    }

    // Upload document to S3 first
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
    const docId = crypto.randomUUID();
    const s3Key = `documents/${tripId}/${docId}.${ext}`;
    await s3.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: mimeType }),
    );

    // Use Claude vision/document API to extract booking info
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const base64 = buffer.toString("base64");
    const extractPrompt = `You are a travel booking document parser. Extract all booking details from this document and return ONLY a valid JSON object with these exact fields (use null for any missing values):
{
  "type": "flight" or "hotel" or "train" or "bus" or "activity" or "ferry",
  "status": "confirmed" or "pending" or "cancelled",
  "carrier": "airline name, hotel chain, or rail operator",
  "name": "flight number (e.g. AI-302), hotel name, or activity name",
  "fromLocation": "departure city and airport code, e.g. Mumbai (BOM)",
  "toLocation": "arrival city and airport code, e.g. Tokyo Narita (NRT)",
  "departureDate": "YYYY-MM-DD",
  "departureTime": "HH:MM (24hr)",
  "arrivalDate": "YYYY-MM-DD",
  "arrivalTime": "HH:MM (24hr)",
  "checkIn": "YYYY-MM-DD (hotels only)",
  "checkOut": "YYYY-MM-DD (hotels only)",
  "confirmationRef": "booking reference, PNR, or confirmation number",
  "cost": 12345.00,
  "currency": "3-letter ISO currency code, e.g. INR",
  "docType": "ticket" or "hotel_confirmation" or "itinerary" or "other"
}
Return ONLY the JSON object. No explanation, no markdown.`;

    const VALID_BOOKING_TYPES = new Set(["flight", "hotel", "train", "bus", "activity", "ferry"]);
    const VALID_DOC_TYPES = new Set([
      "ticket", "hotel_confirmation", "itinerary", "other", "passport", "visa", "insurance",
    ]);

    let extracted: Record<string, unknown> = {};
    try {
      // Build message content depending on MIME type
      // For PDFs: use Claude native PDF support; for images: use vision
      type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageContent: any[] =
        mimeType === "application/pdf"
          ? [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: extractPrompt },
            ]
          : [
              { type: "image", source: { type: "base64", media_type: mimeType as ImageMime, data: base64 } },
              { type: "text", text: extractPrompt },
            ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client.messages.create as (opts: any) => Promise<any>)({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        ...(mimeType === "application/pdf" ? { betas: ["pdfs-2024-09-25"] } : {}),
        messages: [{ role: "user", content: messageContent }],
      });

      const text: string =
        Array.isArray(response.content) &&
        (response.content as Array<{ type: string; text: string }>)[0]?.type === "text"
          ? (response.content as Array<{ type: string; text: string }>)[0]!.text
          : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch?.[0]) {
        extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      }
    } catch (err) {
      // If AI fails, create a minimal booking — doc is already in S3
      console.error("[createBookingFromDocument] AI parsing failed:", err);
    }

    const bookingType = (
      VALID_BOOKING_TYPES.has(extracted.type as string) ? extracted.type : "flight"
    ) as import("@prisma/client").BookingType;

    const safeDocType = (
      VALID_DOC_TYPES.has(extracted.docType as string) ? extracted.docType : "ticket"
    ) as import("@prisma/client").DocumentType;

    // Create the booking from extracted data
    const booking = await prisma.booking.create({
      data: {
        tripId,
        type: bookingType,
        status: (["confirmed", "pending", "cancelled"].includes(extracted.status as string)
          ? extracted.status
          : "pending") as import("@prisma/client").BookingStatus,
        carrier: (extracted.carrier as string | null) ?? null,
        name: (extracted.name as string | null) ?? fileName,
        fromLocation: (extracted.fromLocation as string | null) ?? null,
        toLocation: (extracted.toLocation as string | null) ?? null,
        departureDate: extracted.departureDate ? new Date(extracted.departureDate as string) : null,
        departureTime: (extracted.departureTime as string | null) ?? null,
        arrivalDate: extracted.arrivalDate ? new Date(extracted.arrivalDate as string) : null,
        arrivalTime: (extracted.arrivalTime as string | null) ?? null,
        checkIn: extracted.checkIn ? new Date(extracted.checkIn as string) : null,
        checkOut: extracted.checkOut ? new Date(extracted.checkOut as string) : null,
        confirmationRef: (extracted.confirmationRef as string | null) ?? null,
        cost: typeof extracted.cost === "number" ? extracted.cost : null,
        currency: (extracted.currency as string | null) ?? null,
        travelers: [],
        details: undefined,
      },
    });

    // Create document record linked to the new booking
    const doc = await prisma.document.create({
      data: {
        userId,
        tripId,
        type: safeDocType,
        name: fileName,
        s3Key,
        mimeType,
        sizeBytes: buffer.length,
        metadata: { bookingId: booking.id } as Prisma.InputJsonValue,
      },
    });

    return {
      documentId: doc.id,
      booking: {
        id: booking.id,
        tripId: booking.tripId,
        type: booking.type,
        status: booking.status,
        carrier: booking.carrier,
        name: booking.name,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        departureDate: booking.departureDate,
        departureTime: booking.departureTime,
        arrivalDate: booking.arrivalDate,
        arrivalTime: booking.arrivalTime,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        confirmationRef: booking.confirmationRef,
        cost: toNumber(booking.cost),
        currency: booking.currency,
        travelers: booking.travelers,
        details: null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    };
  },

  // List documents attached to a trip
  async listTripDocuments(tripId: string, userId: string) {
    await requireMember(tripId, userId);
    const docs = await prisma.document.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        name: true,
        s3Key: true,
        mimeType: true,
        sizeBytes: true,
        expiryDate: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    return docs;
  },

  // Upload a document to S3 and store record in DB
  async uploadTripDocument(
    tripId: string,
    userId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    docType: string,
    bookingId?: string,
  ) {
    await requireMember(tripId, userId);

    const ALLOWED_MIME = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new ValidationError("Only PDF, JPEG, PNG or WebP files are allowed");
    }

    const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
    const docId = crypto.randomUUID();
    const s3Key = `documents/${tripId}/${docId}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const validTypes = [
      "passport", "visa", "ticket", "insurance",
      "hotel_confirmation", "itinerary", "other",
    ];
    const safeType = validTypes.includes(docType) ? docType : "other";

    const doc = await prisma.document.create({
      data: {
        userId,
        tripId,
        type: safeType as import("@prisma/client").DocumentType,
        name: fileName,
        s3Key,
        mimeType,
        sizeBytes: buffer.length,
        metadata: bookingId ? ({ bookingId } as import("@prisma/client").Prisma.InputJsonValue) : undefined,
      },
    });

    return doc;
  },

  // Delete a document from S3 and DB
  async deleteTripDocument(tripId: string, userId: string, docId: string) {
    await requireMember(tripId, userId);

    const doc = await prisma.document.findFirst({
      where: { id: docId, tripId },
    });
    if (!doc) throw new NotFoundError("Document");

    // Remove from S3 (best-effort — don't block DB deletion on S3 error)
    if (doc.s3Key) {
      try {
        await s3.send(
          new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }),
        );
      } catch {
        // S3 deletion non-fatal
      }
    }

    await prisma.document.delete({ where: { id: docId } });
  },
};
