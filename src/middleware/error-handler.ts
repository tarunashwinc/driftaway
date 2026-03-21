import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Resource") {
    super(404, `${entity} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(409, message, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(429, message, "RATE_LIMITED");
  }
}

export function errorHandler(
  error: FastifyError | AppError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const statusCode = "statusCode" in error ? error.statusCode ?? 500 : 500;
  const code = "code" in error ? error.code : "INTERNAL_ERROR";

  if (statusCode >= 500) {
    _request.log.error(error);
  }

  reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  });
}
