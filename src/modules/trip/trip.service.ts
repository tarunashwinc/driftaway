import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
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
              _count: { select: { members: true } },
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
};
