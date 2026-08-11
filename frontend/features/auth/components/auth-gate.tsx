"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface AuthGateProps { children: ReactNode; loginHref: string }

export function AuthGate({ children, loginHref }: AuthGateProps) {
  const router = useRouter();
  const auth = useAuthSession();

  useEffect(() => {
    if (auth.state.status === "anonymous") router.replace(loginHref);
  }, [auth.state.status, loginHref, router]);

  if (auth.state.status === "authenticated") return children;

  if (auth.state.status === "error") {
    return (
      <main className="min-h-screen bg-cream px-5 py-16 text-center text-ink">
        <p className="font-semibold text-red-700" role="alert">{auth.state.message}</p>
        <button className="mt-5 rounded-full bg-leaf px-5 py-3 font-bold text-white" onClick={() => void auth.reload()} type="button">다시 시도</button>
      </main>
    );
  }

  return <main className="min-h-screen bg-cream px-5 py-16 text-center text-muted">로그인 상태를 확인하고 있습니다.</main>;
}
