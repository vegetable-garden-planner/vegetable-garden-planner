"use client";

import Link from "next/link";
import { clearBrowserAuthSession } from "@/features/auth/infrastructure/browser-auth-session";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export function AuthHeaderMenu() {
  const auth = useAuthSession();

  if (auth.status === "authenticated") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden font-bold text-muted sm:inline">{auth.session.user.nickname}님</span>
        <button className="rounded-full border border-ink/15 px-4 py-2 font-bold" onClick={clearBrowserAuthSession} type="button">로그아웃</button>
      </div>
    );
  }

  return <Link className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:text-leaf" href="/login">로그인</Link>;
}
