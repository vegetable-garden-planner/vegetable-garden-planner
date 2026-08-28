"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { LandingPage } from "@/features/landing/components/landing-page";

/**
 * 루트 `/`
 *
 * 로그인 사용자  → 기존과 동일하게 `/dashboard`
 * 비로그인 사용자 → 심어봄 소개 랜딩
 *
 * 인증 판단은 기존 AuthSessionProvider 를 그대로 쓴다.
 */
export default function Home() {
  const router = useRouter();
  const auth = useAuthSession();
  const status = auth.state.status;

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "anonymous" || status === "error") {
    return <LandingPage />;
  }

  return <main className="min-h-screen bg-cream px-5 py-16 text-center text-muted">불러오는 중입니다.</main>;
}
