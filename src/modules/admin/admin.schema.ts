import { z } from "zod";

export const updateBrandSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  darkColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  surfaceColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  fontDisplay: z.string().max(100).optional(),
  fontBody: z.string().max(100).optional(),
  extras: z.record(z.unknown()).optional(),
});

export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
