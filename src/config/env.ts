import { z } from "zod";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("debug"),
  API_PREFIX: z.string().default("/api/v1"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("30d"),

  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_PHONE_NUMBER: z.string().default(""),

  HCAPTCHA_SECRET: z.string().default("0x0000000000000000000000000000000000000000"),
  HCAPTCHA_SITE_KEY: z.string().default("10000000-ffff-ffff-ffff-000000000000"),

  OPENAI_API_KEY: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),
  GOOGLE_AI_KEY: z.string().default(""),

  WHATSAPP_API_URL: z.string().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),

  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("driftaway"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),

  GOOGLE_MAPS_API_KEY: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  EXCHANGE_RATE_API_KEY: z.string().default(""),
  DEV_OTP_BYPASS: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
