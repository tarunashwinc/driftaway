import { prisma } from "../../config/prisma.js";
import {
  NotFoundError,
  ForbiddenError,
} from "../../middleware/error-handler.js";
import type {
  UpdateProfileInput,
  CreateMinorInput,
  UpdateMinorInput,
} from "./user.schema.js";

export const userService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        dateOfBirth: true,
        avatarUrl: true,
        role: true,
        homeCity: true,
        passportExpiry: true,
        emergencyContact: true,
        preferences: true,
        frequentFlyerIds: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { tripMemberships: true, minors: true } },
      },
    });
    if (!user) throw new NotFoundError("User");
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.dateOfBirth !== undefined && {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.homeCity !== undefined && { homeCity: data.homeCity }),
        ...(data.passportExpiry !== undefined && {
          passportExpiry: data.passportExpiry
            ? new Date(data.passportExpiry)
            : null,
        }),
        ...(data.emergencyContact !== undefined && {
          emergencyContact: data.emergencyContact ?? undefined,
        }),
        ...(data.preferences !== undefined && {
          preferences: data.preferences ?? undefined,
        }),
        ...(data.frequentFlyerIds !== undefined && {
          frequentFlyerIds: data.frequentFlyerIds ?? undefined,
        }),
      },
      select: {
        id: true,
        phone: true,
        name: true,
        dateOfBirth: true,
        avatarUrl: true,
        role: true,
        homeCity: true,
        passportExpiry: true,
        emergencyContact: true,
        preferences: true,
        frequentFlyerIds: true,
        updatedAt: true,
      },
    });
    return user;
  },

  async listMinors(guardianId: string) {
    return prisma.minor.findMany({
      where: { guardianId },
      orderBy: { createdAt: "asc" },
    });
  },

  async createMinor(guardianId: string, data: CreateMinorInput) {
    return prisma.minor.create({
      data: {
        name: data.name,
        dateOfBirth: new Date(data.dateOfBirth),
        guardianId,
        specialNeeds: data.specialNeeds,
        preferences: data.preferences ?? undefined,
      },
    });
  },

  async updateMinor(
    guardianId: string,
    minorId: string,
    data: UpdateMinorInput,
  ) {
    const minor = await prisma.minor.findUnique({ where: { id: minorId } });
    if (!minor) throw new NotFoundError("Minor");
    if (minor.guardianId !== guardianId)
      throw new ForbiddenError("Not your minor");
    return prisma.minor.update({
      where: { id: minorId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.specialNeeds !== undefined && {
          specialNeeds: data.specialNeeds,
        }),
        ...(data.preferences !== undefined && {
          preferences: data.preferences ?? undefined,
        }),
      },
    });
  },

  async deleteMinor(guardianId: string, minorId: string) {
    const minor = await prisma.minor.findUnique({ where: { id: minorId } });
    if (!minor) throw new NotFoundError("Minor");
    if (minor.guardianId !== guardianId)
      throw new ForbiddenError("Not your minor");
    await prisma.minor.delete({ where: { id: minorId } });
  },

  async getFamilyGroup(userId: string) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const prefs = currentUser?.preferences as Record<string, unknown> | null;
    const familyGroupId = prefs?.familyGroupId as string | undefined;

    if (!familyGroupId) return { familyGroupId: null, members: [], minors: [] };

    // All users in the same family group (excluding self)
    const members = await prisma.user.findMany({
      where: {
        id: { not: userId },
        preferences: { path: ["familyGroupId"], equals: familyGroupId },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        avatarUrl: true,
        dateOfBirth: true,
        preferences: true,
      },
    });

    // Minors belonging to anyone in the family group (including self)
    const guardianIds = [userId, ...members.map((m) => m.id)];
    const minors = await prisma.minor.findMany({
      where: { guardianId: { in: guardianIds } },
      orderBy: { dateOfBirth: "asc" },
    });

    return { familyGroupId, members, minors };
  },
};
