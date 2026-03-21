import type { UserRole } from "@prisma/client";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface AuthUser {
  userId: string;
  role: UserRole;
}

export function getPaginationParams(query: PaginationQuery): { skip: number; take: number } {
  const page = Math.max(1, query.page ?? 1);
  const take = Math.min(100, query.limit ?? 20);
  return { skip: (page - 1) * take, take };
}

export function buildPaginationMeta(total: number, query: PaginationQuery): PaginationMeta {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, query.limit ?? 20);
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
