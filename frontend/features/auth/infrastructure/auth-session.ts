import type { AuthUser } from "../domain/auth.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";

const AUTH_SESSION_KEY = "simeobom:auth-session";

export const AUTH_SESSION_CHANGE_EVENT = "simeobom:auth-session-change";

export interface AuthSession {
  user: AuthUser;
  establishedAt: string;
}

export class InvalidAuthSessionDataError extends Error {
  constructor() {
    super("로그인 정보를 확인할 수 없습니다. 세션을 초기화해 주세요.");
    this.name = "InvalidAuthSessionDataError";
  }
}

export function createAuthSession(
  user: AuthUser,
  establishedAt: string,
): AuthSession {
  return { user, establishedAt };
}

export function getAuthSessionSnapshot(storage: KeyValueStorage): string {
  return storage.getItem(AUTH_SESSION_KEY) ?? "";
}

export function parseAuthSessionSnapshot(snapshot: string): AuthSession | null {
  if (!snapshot) {
    return null;
  }

  const parsed: unknown = JSON.parse(snapshot);
  if (!isAuthSession(parsed)) {
    throw new InvalidAuthSessionDataError();
  }

  return parsed;
}

export function saveAuthSession(
  storage: KeyValueStorage,
  session: AuthSession,
) {
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(storage: KeyValueStorage) {
  storage.removeItem(AUTH_SESSION_KEY);
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  return typeof value.user.email === "string"
    && typeof value.user.nickname === "string"
    && typeof value.establishedAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
