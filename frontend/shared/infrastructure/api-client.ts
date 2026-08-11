const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

interface ApiErrorBody {
  error?: {
    message?: string;
    fields?: Record<string, string[]>;
  };
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGetList<T>(path: string): Promise<T[]> {
  const response = await apiRequest<{ data: T[] }>(path);
  return response.data;
}

export async function apiGetData<T>(path: string): Promise<T> {
  const response = await apiRequest<{ data: T }>(path);
  return response.data;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  if (!(["GET", "HEAD", "OPTIONS"].includes(method))) {
    await ensureCsrfCookie();
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const csrfToken = readCookie("XSRF-TOKEN");
  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", decodeURIComponent(csrfToken));
  }

  const response = await fetch(`${API_ROOT}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

let csrfRequest: Promise<void> | null = null;

async function ensureCsrfCookie() {
  csrfRequest ??= fetch(`${API_ROOT}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }).then((response) => {
    if (!response.ok) {
      throw new ApiError("보안 쿠키를 발급받지 못했습니다.", response.status);
    }
  }).finally(() => {
    csrfRequest = null;
  });
  await csrfRequest;
}

async function toApiError(response: Response) {
  let body: ApiErrorBody = {};
  try {
    body = await response.json() as ApiErrorBody;
  } catch {
    // Empty and non-JSON error responses use the status-based message below.
  }
  const fields = body.error?.fields ?? body.errors ?? {};
  const firstFieldMessage = Object.values(fields).flat()[0];
  const fallback = response.status === 401
    ? "로그인이 필요합니다."
    : response.status === 419
      ? "로그인 보안 정보가 만료되었습니다. 다시 시도해 주세요."
      : "요청을 처리하지 못했습니다.";
  return new ApiError(
    body.error?.message ?? firstFieldMessage ?? body.message ?? fallback,
    response.status,
    fields,
  );
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length) ?? "";
}
