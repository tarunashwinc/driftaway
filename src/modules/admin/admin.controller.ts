import type { FastifyRequest, FastifyReply } from "fastify";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from "../../middleware/error-handler.js";
import { updateBrandSchema } from "./admin.schema.js";
import { adminService } from "./admin.service.js";

export const adminController = {
  async getBrand(_request: FastifyRequest, reply: FastifyReply) {
    const config = await adminService.getBrandConfig();
    return reply.send({ success: true, data: config });
  },

  async updateBrand(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    if (request.user.role !== "superadmin") {
      throw new ForbiddenError("Requires superadmin role");
    }

    const parsed = updateBrandSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }

    const config = await adminService.updateBrandConfig(parsed.data);
    return reply.send({ success: true, data: config });
  },

  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();

    const q = request.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(q.page ?? "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(q.limit ?? "20", 10) || 20),
    );

    const { users, total } = await adminService.getUsers(page, limit);
    return reply.send({
      success: true,
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },

  async getAnalytics(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const analytics = await adminService.getAnalytics();
    return reply.send({ success: true, data: analytics });
  },
};
