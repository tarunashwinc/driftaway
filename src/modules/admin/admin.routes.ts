import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/auth.js";
import { adminController } from "./admin.controller.js";

export async function adminRoutes(app: FastifyInstance) {
  // Public: brand config
  app.get("/brand", adminController.getBrand);

  // Protected admin routes
  app.put(
    "/brand",
    { preHandler: [authenticate, requireRole("superadmin")] },
    adminController.updateBrand,
  );
  app.get(
    "/users",
    { preHandler: [authenticate, requireRole("superadmin")] },
    adminController.getUsers,
  );
  app.get(
    "/analytics",
    { preHandler: [authenticate, requireRole("superadmin")] },
    adminController.getAnalytics,
  );
}
