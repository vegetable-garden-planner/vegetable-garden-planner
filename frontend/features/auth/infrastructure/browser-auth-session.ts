"use client";

import type { AuthUser } from "@/features/auth/domain/auth";
import {
  AUTH_SESSION_CHANGE_EVENT,
  clearAuthSession,
  createAuthSession,
  saveAuthSession,
} from "@/features/auth/infrastructure/auth-session";

export function establishBrowserAuthSession(user: AuthUser) {
  const session = createAuthSession(user, new Date().toISOString());
  saveAuthSession(window.localStorage, session);
  announceAuthSessionChange();
}

export function clearBrowserAuthSession() {
  clearAuthSession(window.localStorage);
  announceAuthSessionChange();
}

function announceAuthSessionChange() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
}
