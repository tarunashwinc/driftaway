const API_BASE = "/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    // Try to refresh token if 401
    if (res.status === 401 && path !== "/auth/refresh") {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          const data = (await refreshRes.json()) as { data: { accessToken: string } };
          accessToken = data.data.accessToken;
          headers["Authorization"] = `Bearer ${accessToken}`;
          const retryRes = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
            credentials: "include",
          });
          if (retryRes.ok) {
            return retryRes.json() as Promise<T>;
          }
        }
      } catch {
        // Refresh failed
      }
    }

    let errorData: { error?: { message?: string; code?: string } } = {};
    try {
      errorData = (await res.json()) as typeof errorData;
    } catch {
      /* ignore */
    }
    throw new ApiError(
      res.status,
      errorData.error?.message ?? "Request failed",
      errorData.error?.code
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { ApiError };
