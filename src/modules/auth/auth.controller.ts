import type { FastifyRequest, FastifyReply } from "fastify";
import { authService } from "./auth.service.js";
import { sendOtpSchema, verifyOtpSchema } from "./auth.schema.js";
import { ValidationError, UnauthorizedError } from "../../middleware/error-handler.js";

const REFRESH_COOKIE = "refreshToken";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const authController = {
  async sendOtp(request: FastifyRequest, reply: FastifyReply) {
    const result = sendOtpSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0]?.message ?? "Invalid input");
    }
    const { phone, captchaToken } = result.data;
    const data = await authService.sendOtp(phone, captchaToken);
    reply.send({ success: true, data });
  },

  async verifyOtp(request: FastifyRequest, reply: FastifyReply) {
    const result = verifyOtpSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0]?.message ?? "Invalid input");
    }
    const { phone, code } = result.data;
    const authResult = await authService.verifyOtp(phone, code);
    // Set refresh token as httpOnly cookie
    reply.setCookie(REFRESH_COOKIE, authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: THIRTY_DAYS_MS / 1000,
      path: "/",
    });
    reply.send({
      success: true,
      data: {
        accessToken: authResult.accessToken,
        user: authResult.user,
        isNewUser: authResult.isNewUser,
      },
    });
  },

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedError("No refresh token");
    const data = await authService.refreshAccessToken(token);
    reply.send({ success: true, data });
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[REFRESH_COOKIE];
    if (token) {
      await authService.logout(token).catch(() => {/* ignore */});
    }
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    reply.send({ success: true, message: "Logged out" });
  },
};
