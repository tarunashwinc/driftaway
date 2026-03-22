import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { userRoutes } from "./modules/user/user.routes.js";
import { tripRoutes } from "./modules/trip/trip.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ─── Plugins ───
// Accept both apex and www. variants of the frontend URL so that
// browsers arriving via www.drift-away.in are not blocked by CORS.
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  env.FRONTEND_URL.replace("://", "://www."),
  env.FRONTEND_URL.replace("://www.", "://"),
]);

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow server-to-server calls (no Origin header) and any allowed origin
    if (!origin || allowedOrigins.has(origin)) {
      cb(null, true);
    } else {
      cb(new Error("CORS: origin not allowed"), false);
    }
  },
  credentials: true,
});

await app.register(helmet);
await app.register(cookie);

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB max
});

// ─── Error handler ───
app.setErrorHandler(errorHandler);

// ─── Health check ───
app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

// ─── Routes ───
await app.register(authRoutes, { prefix: `${env.API_PREFIX}/auth` });
await app.register(userRoutes, { prefix: `${env.API_PREFIX}/users` });
await app.register(tripRoutes, { prefix: `${env.API_PREFIX}/trips` });
await app.register(adminRoutes, { prefix: `${env.API_PREFIX}/admin` });

// ─── Start ───
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 DriftAway API running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app };
