import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { userController } from "./user.controller.js";

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/me", userController.getProfile);
  app.put("/me", userController.updateProfile);
  app.post("/me/avatar", userController.uploadAvatar);
  app.get("/me/family", userController.getFamilyGroup);
  app.get("/me/minors", userController.listMinors);
  app.post("/me/minors", userController.createMinor);
  app.put("/me/minors/:id", userController.updateMinor);
  app.delete("/me/minors/:id", userController.deleteMinor);
}
