import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { UpdateBrandInput } from "./admin.schema.js";
import type { AnalyticsData } from "./admin.types.js";

const DEFAULT_BRAND = {
  appName: "DriftAway",
  tagline: "plan less. live more.",
  logoUrl: null,
  primaryColor: "#FF6B35",
  accentColor: "#06D6A0",
  darkColor: "#1A1A2E",
  surfaceColor: "#F8F7F4",
  fontDisplay: "Outfit",
  fontBody: "Space Grotesk",
  extras: null,
};

export const adminService = {
  async getBrandConfig() {
    const config = await prisma.brandConfig.findFirst();
    if (!config) return DEFAULT_BRAND;
    return config;
  },

  async updateBrandConfig(data: UpdateBrandInput) {
    const existing = await prisma.brandConfig.findFirst();

    if (existing) {
      return prisma.brandConfig.update({
        where: { id: existing.id },
        data: {
          ...(data.appName !== undefined && { appName: data.appName }),
          ...(data.tagline !== undefined && { tagline: data.tagline }),
          ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
          ...(data.primaryColor !== undefined && {
            primaryColor: data.primaryColor,
          }),
          ...(data.accentColor !== undefined && {
            accentColor: data.accentColor,
          }),
          ...(data.darkColor !== undefined && { darkColor: data.darkColor }),
          ...(data.surfaceColor !== undefined && {
            surfaceColor: data.surfaceColor,
          }),
          ...(data.fontDisplay !== undefined && {
            fontDisplay: data.fontDisplay,
          }),
          ...(data.fontBody !== undefined && { fontBody: data.fontBody }),
          ...(data.extras !== undefined && { extras: data.extras as Prisma.InputJsonValue }),
        },
      });
    }

    return prisma.brandConfig.create({
      data: {
        appName: data.appName ?? DEFAULT_BRAND.appName,
        tagline: data.tagline ?? DEFAULT_BRAND.tagline,
        logoUrl: data.logoUrl ?? DEFAULT_BRAND.logoUrl,
        primaryColor: data.primaryColor ?? DEFAULT_BRAND.primaryColor,
        accentColor: data.accentColor ?? DEFAULT_BRAND.accentColor,
        darkColor: data.darkColor ?? DEFAULT_BRAND.darkColor,
        surfaceColor: data.surfaceColor ?? DEFAULT_BRAND.surfaceColor,
        fontDisplay: data.fontDisplay ?? DEFAULT_BRAND.fontDisplay,
        fontBody: data.fontBody ?? DEFAULT_BRAND.fontBody,
        extras: (data.extras ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  },

  async getUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { tripMemberships: true, minors: true } },
        },
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const [totalUsers, totalTrips, activeTrips, totalExpensesAgg] =
      await Promise.all([
        prisma.user.count(),
        prisma.trip.count({ where: { deletedAt: null } }),
        prisma.trip.count({
          where: { status: "active", deletedAt: null },
        }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
      ]);

    return {
      totalUsers,
      totalTrips,
      activeTrips,
      totalExpenses: Number(totalExpensesAgg._sum.amount ?? 0),
    };
  },
};
