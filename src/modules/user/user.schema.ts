import { z } from "zod";

const preferencesSchema = z
  .object({
    diet: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    travelStyle: z
      .enum(["backpacker", "comfort", "luxury", "adventure"])
      .optional(),
    languages: z.array(z.string()).optional(),
    accessibility: z.array(z.string()).optional(),
    transportPref: z.union([z.string(), z.array(z.string())]).optional(),
    // extended fields stored in preferences JSON
    gender: z.string().optional(),
    address: z.string().optional(),
    familyGroupId: z.string().optional(),
    familyRole: z.string().optional(),
  })
  .passthrough() // preserve any future fields
  .optional();

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  avatarUrl: z.string().url().optional().nullable(),
  homeCity: z.string().max(100).optional().nullable(),
  passportExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  emergencyContact: z.record(z.string()).optional().nullable(),
  preferences: preferencesSchema,
  frequentFlyerIds: z.record(z.string()).optional().nullable(),
});

export const createMinorSchema = z.object({
  name: z.string().min(1).max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  specialNeeds: z.string().optional(),
  preferences: z
    .object({
      favActivities: z.array(z.string()).optional(),
      dietaryNeeds: z.string().optional(),
    })
    .optional(),
});

export const updateMinorSchema = createMinorSchema.partial();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateMinorInput = z.infer<typeof createMinorSchema>;
export type UpdateMinorInput = z.infer<typeof updateMinorSchema>;
