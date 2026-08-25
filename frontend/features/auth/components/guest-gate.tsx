"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface GuestGateProps { authenticatedHref: string; children: ReactNode }

export function GuestGate({ authenticatedHref, children }: GuestGateProps) {
  const router = useRouter();
  const auth = useAuthSession();

  useEffect(() => {
    if (auth.state.status === "authenticated") router.replace(authenticatedHref);
  }, [auth.state.status, authenticatedHref, router]);

  if (auth.state.status === "authenticated") {
    return <div className="min-h-screen bg-cream px-5 py-16 text-center text-muted">내 텃밭으로 이동하고 있습니다.</div>;
  }

  return children;
}
