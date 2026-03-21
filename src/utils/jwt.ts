import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../middleware/error-handler.js";
import type { UserRole } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match?.[1] || !match[2]) return 900;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "s") return num;
  if (unit === "m") return num * 60;
  if (unit === "h") return num * 3600;
  if (unit === "d") return num * 86400;
  return 900;
}

export function generateAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: parseExpiryToSeconds(env.JWT_ACCESS_EXPIRY) });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
