"use client";

import { logoutUser } from "@/features/auth/infrastructure/auth-api";
import { AUTH_SESSION_CHANGE_EVENT } from "@/features/auth/infrastructure/auth-session";
import { notifyApiDataChanged } from "@/shared/infrastructure/api-resource-store";

export function announceAuthSessionChange() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
  notifyApiDataChanged();
}

export async function clearBrowserAuthSession() {
  try {
    await logoutUser();
  } finally {
    announceAuthSessionChange();
  }
}
