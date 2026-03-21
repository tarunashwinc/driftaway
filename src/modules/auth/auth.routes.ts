import type { FastifyInstance } from "fastify";
import { authController } from "./auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /otp/send — Send OTP to phone number
  app.post("/otp/send", authController.sendOtp);

  // POST /otp/verify — Verify OTP, return JWT tokens + user
  app.post("/otp/verify", authController.verifyOtp);

  // POST /refresh — Refresh access token using refresh token
  app.post("/refresh", authController.refreshToken);

  // POST /logout — Revoke refresh token
  app.post("/logout", authController.logout);
}
