import type { FastifyRequest, FastifyReply } from "fastify";
import { ValidationError, UnauthorizedError } from "../../middleware/error-handler.js";
import {
  updateProfileSchema,
  createMinorSchema,
  updateMinorSchema,
} from "./user.schema.js";
import { userService } from "./user.service.js";

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
};
