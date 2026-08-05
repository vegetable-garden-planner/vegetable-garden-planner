"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  AUTH_SESSION_CHANGE_EVENT,
  getAuthSessionSnapshot,
  parseAuthSessionSnapshot,
  type AuthSession,
} from "@/features/auth/infrastructure/auth-session";

export type AuthSessionState =
  | { status: "authenticated"; session: AuthSession }
  | { status: "anonymous" }
  | { status: "error"; message: string };

export function useAuthSession(): AuthSessionState {
  const snapshot = useSyncExternalStore(
    subscribeToAuthSession,
    () => getAuthSessionSnapshot(window.localStorage),
    getEmptySnapshot,
  );

  return useMemo(() => {
    try {
      const session = parseAuthSessionSnapshot(snapshot);
      return session
        ? { status: "authenticated", session }
        : { status: "anonymous" };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "로그인 정보를 확인하지 못했습니다.",
      };
    }
  }, [snapshot]);
}

function subscribeToAuthSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_SESSION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, onStoreChange);
  };
}

function getEmptySnapshot() {
  return "";
}
