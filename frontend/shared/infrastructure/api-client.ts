const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const CSRF_URL = process.env.NEXT_PUBLIC_CSRF_URL ?? "http://localhost:8000/sanctum/csrf-cookie";

interface ApiErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string[]> };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (isStateChanging(init.method)) {
    if (!findXsrfCookie()) await prepareCsrfCookie();
    headers.set("X-XSRF-TOKEN", readXsrfToken());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) throw await createApiError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function prepareCsrfCookie(): Promise<void> {
  const response = await fetch(CSRF_URL, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiError("보안 쿠키를 준비하지 못했습니다.", response.status, "CSRF_COOKIE_FAILED");
  }
}

function isStateChanging(method: string | undefined): boolean {
  return method !== undefined && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function readXsrfToken(): string {
  const cookie = findXsrfCookie();
  if (!cookie) {
    throw new ApiError("보안 쿠키가 없습니다. 다시 시도해 주세요.", 419, "CSRF_TOKEN_MISSING");
  }
  return decodeURIComponent(cookie.slice("XSRF-TOKEN=".length));
}

function findXsrfCookie(): string | undefined {
  return document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="));
}

async function createApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody;
  try {
    body = await response.json() as ApiErrorBody;
  } catch {
    return new ApiError("서버 요청을 처리하지 못했습니다.", response.status, "HTTP_ERROR");
  }
  return new ApiError(
    body.error?.message ?? "서버 요청을 처리하지 못했습니다.",
    response.status,
    body.error?.code ?? "HTTP_ERROR",
    body.error?.fields,
  );
}
