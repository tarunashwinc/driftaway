import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format (+1234567890)"),
  captchaToken: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format (+1234567890)"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
