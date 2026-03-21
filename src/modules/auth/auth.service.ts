import twilio from "twilio";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { generateOtp, getOtpExpiry } from "../../utils/otp.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { ValidationError, UnauthorizedError } from "../../middleware/error-handler.js";
import type { AuthResult } from "./auth.types.js";

// ─── hCaptcha ───

async function verifyCaptcha(token: string): Promise<void> {
  const params = new URLSearchParams({
    secret: env.HCAPTCHA_SECRET,
    response: token,
  });

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await response.json()) as { success: boolean };
  if (!data.success) {
    throw new ValidationError("Invalid captcha. Please try again.");
  }
}

// ─── Twilio client (lazy init) ───

function getTwilioClient(): ReturnType<typeof twilio> {
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

function isTwilioConfigured(): boolean {
  return (
    env.TWILIO_ACCOUNT_SID !== "" &&
    env.TWILIO_AUTH_TOKEN !== "" &&
    env.TWILIO_PHONE_NUMBER !== ""
  );
}

// ─── Auth Service ───

export const authService = {
  async sendOtp(
    phone: string,
    captchaToken?: string,
  ): Promise<{ message: string; devOtp?: string }> {
    const isDev = env.NODE_ENV === "development" || env.DEV_OTP_BYPASS;

    // Verify hCaptcha in production when token is provided
    if (!isDev && captchaToken) {
      await verifyCaptcha(captchaToken);
    }

    // Invalidate all existing active OTPs for this phone
    await prisma.otpCode.updateMany({
      where: {
        phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });

    // Generate new OTP
    const code = generateOtp();
    const expiresAt = getOtpExpiry();

    // Store OTP in DB
    await prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    // In dev or when Twilio is not configured: skip SMS
    if (isDev || !isTwilioConfigured()) {
      return { message: "OTP generated (dev mode)", devOtp: code };
    }

    // Send SMS via Twilio in production
    const client = getTwilioClient();
    await client.messages.create({
      body: `Your DriftAway verification code is: ${code}. Valid for 5 minutes.`,
      from: env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return { message: "OTP sent successfully" };
  },

  async verifyOtp(phone: string, code: string): Promise<AuthResult> {
    const isDev = env.NODE_ENV === "development" || env.DEV_OTP_BYPASS;

    // Dev shortcut: last 6 digits of phone always works in development
    const devFixedOtp = phone.replace(/\D/g, "").slice(-6);
    const isDevBypass = isDev && code === devFixedOtp;

    if (!isDevBypass) {
      // Find valid OTP in DB
      const otpRecord = await prisma.otpCode.findFirst({
        where: {
          phone,
          code,
          verifiedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!otpRecord) {
        const existingOtp = await prisma.otpCode.findFirst({
          where: { phone, verifiedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (existingOtp) {
          await prisma.otpCode.update({
            where: { id: existingOtp.id },
            data: { attempts: { increment: 1 } },
          });
        }
        throw new ValidationError("Invalid or expired OTP code");
      }

      // Mark OTP as verified
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { verifiedAt: new Date() },
      });
    }

    // Upsert user by phone
    const lastFour = phone.slice(-4);
    const isNewUser = !(await prisma.user.findFirst({ where: { phone } }));

    const user = await prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        name: `Traveler ${lastFour}`,
        lastLoginAt: new Date(),
      },
      update: {
        lastLoginAt: new Date(),
      },
    });

    // Link the most recent OTP to the user (only for non-bypass flow)
    if (!isDevBypass) {
      const latestOtp = await prisma.otpCode.findFirst({
        where: { phone, userId: null },
        orderBy: { createdAt: "desc" },
      });
      if (latestOtp) {
        await prisma.otpCode.update({
          where: { id: latestOtp.id },
          data: { userId: user.id },
        });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshTokenValue = generateRefreshToken();

    // Store refresh token (30 days)
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      isNewUser,
    };
  },

  async refreshAccessToken(refreshTokenValue: string): Promise<{ accessToken: string }> {
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshTokenValue,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const accessToken = generateAccessToken(tokenRecord.user.id, tokenRecord.user.role);
    return { accessToken };
  },

  async logout(refreshTokenValue: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue },
      data: { revokedAt: new Date() },
    });
  },
};
