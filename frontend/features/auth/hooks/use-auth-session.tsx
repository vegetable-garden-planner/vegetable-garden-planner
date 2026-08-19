"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "@/features/auth/domain/auth";
import { fetchCurrentUser, logout as requestLogout } from "@/features/auth/infrastructure/auth-api";
import { clearCachedResources } from "@/shared/hooks/use-cached-resource";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "anonymous" }
  | { status: "error"; message: string };

interface AuthSessionContextValue {
  state: AuthSessionState;
  authenticate: (user: AuthUser) => void;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthSessionState>({ status: "loading" });

  async function reload() {
    setState({ status: "loading" });
    try {
      const user = await fetchCurrentUser();
      setState(user ? { status: "authenticated", user } : { status: "anonymous" });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }

  useEffect(() => {
    let active = true;
    void fetchCurrentUser()
      .then((user) => {
        if (active) setState(user ? { status: "authenticated", user } : { status: "anonymous" });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: toMessage(error) });
      });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthSessionContextValue>(() => ({
    state,
    authenticate: (user) => {
      clearCachedResources();
      setState({ status: "authenticated", user });
    },
    logout: async () => {
      await requestLogout();
      clearCachedResources();
      setState({ status: "anonymous" });
    },
    reload,
  }), [state]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error("AuthSessionProvider is required.");
  return context;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "로그인 상태를 확인하지 못했습니다.";
}
