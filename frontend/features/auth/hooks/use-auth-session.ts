"use client";

import { useSyncExternalStore } from "react";
import type { AuthUser } from "@/features/auth/domain/auth";
import { getCurrentUser } from "@/features/auth/infrastructure/auth-api";
import { AUTH_SESSION_CHANGE_EVENT } from "@/features/auth/infrastructure/auth-session";
import { ApiError } from "@/shared/infrastructure/api-client";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "authenticated"; session: { user: AuthUser } }
  | { status: "anonymous" }
  | { status: "error"; message: string };

const loadingState: AuthSessionState = { status: "loading" };
let state: AuthSessionState = loadingState;
let started = false;
let activeRequest = 0;
const listeners = new Set<() => void>();

export function useAuthSession(): AuthSessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function refreshAuthSession() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, load);
    void load();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, load);
      started = false;
    }
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return loadingState;
}

async function load() {
  const requestId = ++activeRequest;
  state = loadingState;
  emit();
  try {
    const user = await getCurrentUser();
    if (requestId === activeRequest) {
      state = { status: "authenticated", session: { user } };
    }
  } catch (error) {
    if (requestId !== activeRequest) return;
    state = error instanceof ApiError && error.status === 401
      ? { status: "anonymous" }
      : {
          status: "error",
          message: error instanceof Error ? error.message : "로그인 정보를 확인하지 못했습니다.",
        };
  }
  emit();
}

function emit() {
  listeners.forEach((listener) => listener());
}
