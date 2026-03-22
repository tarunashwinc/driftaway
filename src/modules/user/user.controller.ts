import type { FastifyRequest, FastifyReply } from "fastify";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ValidationError, UnauthorizedError } from "../../middleware/error-handler.js";
import {
  updateProfileSchema,
  createMinorSchema,
  updateMinorSchema,
} from "./user.schema.js";
import { userService } from "./user.service.js";
import { s3, S3_BUCKET } from "../../config/s3.js";
import { env } from "../../config/env.js";

export const userController = {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const user = await userService.getProfile(request.user.userId);
    return reply.send({ success: true, data: user });
  },

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();

    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }

    const user = await userService.updateProfile(
      request.user.userId,
      parsed.data,
    );
    return reply.send({ success: true, data: user });
  },

  async listMinors(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const minors = await userService.listMinors(request.user.userId);
    return reply.send({ success: true, data: minors });
  },

  async createMinor(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();

    const parsed = createMinorSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }

    const minor = await userService.createMinor(
      request.user.userId,
      parsed.data,
    );
    return reply.status(201).send({ success: true, data: minor });
  },

  async updateMinor(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    if (!request.user) throw new UnauthorizedError();

    const parsed = updateMinorSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }

    const minor = await userService.updateMinor(
      request.user.userId,
      request.params.id,
      parsed.data,
    );
    return reply.send({ success: true, data: minor });
  },

  async deleteMinor(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    if (!request.user) throw new UnauthorizedError();
    await userService.deleteMinor(request.user.userId, request.params.id);
    return reply.send({ success: true, data: null });
  },

  async getFamilyGroup(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const result = await userService.getFamilyGroup(request.user.userId);
    return reply.send({ success: true, data: result });
  },

  async uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();

    const data = await request.file();
    if (!data) throw new ValidationError("No file uploaded");

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(data.mimetype)) {
      throw new ValidationError("Only JPEG, PNG, WebP or GIF images are allowed");
    }

    const ext = data.mimetype.split("/")[1] ?? "jpg";
    const key = `avatars/${request.user.userId}.${ext}`;
    const buffer = await data.toBuffer();

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: data.mimetype,
    }));

    // Build public URL — use S3_PUBLIC_URL if set (production CDN/proxy),
    // otherwise fall back to the raw S3 endpoint (local dev).
    const publicBase = env.S3_PUBLIC_URL || env.S3_ENDPOINT;
    const avatarUrl = `${publicBase}/${S3_BUCKET}/${key}`;

    const user = await userService.updateProfile(request.user.userId, { avatarUrl });
    return reply.send({ success: true, data: { avatarUrl: user.avatarUrl } });
  },
};
