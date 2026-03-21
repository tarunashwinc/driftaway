import { z } from "zod";

export const createTripSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  subDestinations: z.array(z.string()).default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).default("INR"),
  budgetTotal: z.number().positive().optional(),
  aiProvider: z.enum(["openai", "claude", "gemini"]).default("claude"),
  preferences: z
    .object({
      pace: z.enum(["slow", "moderate", "fast"]).optional(),
      focusAreas: z.array(z.string()).optional(),
      avoidCrowds: z.boolean().optional(),
      wishlist: z.array(z.string().max(200)).optional(),
      placesToVisit: z.array(z.string().max(200)).optional(),
    })
    .optional(),
  bannerConfig: z
    .object({
      gradient: z.string().optional(),
      emoji: z.string().optional(),
      imageUrl: z.string().url().optional(),
    })
    .optional(),
  startCity: z.string().optional(), // organizer's start city
});

export const updateTripSchema = createTripSchema.partial().omit({ aiProvider: true });

export const inviteTravelerSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  role: z.enum(["participant", "viewer"]).default("participant"),
  startCity: z.string().optional(),
});

export const addMinorSchema = z.object({
  minorId: z.string().uuid(),
});

export const generatePlanSchema = z.object({
  provider: z.enum(["openai", "claude", "gemini"]).optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const updateItineraryItemSchema = z.object({
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  activity: z.string().max(300).optional(),
  type: z
    .enum([
      "hotel",
      "sightseeing",
      "dining",
      "transport",
      "adventure",
      "culture",
      "wellness",
      "shopping",
      "other",
    ])
    .optional(),
  notes: z.string().optional(),
  thumbnail: z.string().optional(),
  costLocal: z.number().optional(),
  localCurrency: z.string().length(3).optional(),
});

export const addBookingSchema = z.object({
  type: z.enum(["flight", "hotel", "train", "bus", "activity", "ferry"]),
  status: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),
  carrier: z.string().max(100).optional(),
  name: z.string().max(300).optional(),
  fromLocation: z.string().max(100).optional(),
  toLocation: z.string().max(100).optional(),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  departureTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  arrivalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  checkIn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkOut: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  confirmationRef: z.string().max(50).optional(),
  cost: z.number().optional(),
  currency: z.string().length(3).optional(),
  travelers: z.array(z.string().uuid()).default([]),
  details: z.record(z.unknown()).optional(),
});

export const updateBookingSchema = addBookingSchema.partial();

export const addExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.string().max(50),
  description: z.string().max(300).optional(),
  isShared: z.boolean().default(false),
  splitWith: z.array(z.string().uuid()).default([]),
});

export const addChecklistItemSchema = z.object({
  text: z.string().min(1).max(300),
  category: z.string().max(50),
  assignedTo: z.string().uuid().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type InviteTravelerInput = z.infer<typeof inviteTravelerSchema>;
export type AddBookingInput = z.infer<typeof addBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>;
export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>;
export type AiChatInput = z.infer<typeof aiChatSchema>;
