"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export default function Home() {
  const router = useRouter();
  const auth = useAuthSession();

  useEffect(() => {
    if (auth.state.status === "authenticated") {
      router.replace("/dashboard");
      return;
    }
    if (auth.state.status === "anonymous" || auth.state.status === "error") {
      router.replace("/start");
    }
  }, [auth.state.status, router]);

  return <main className="min-h-screen bg-cream px-5 py-16 text-center text-muted">불러오는 중입니다.</main>;
}
