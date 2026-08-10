"use client";

import Link from "next/link";
import { clearBrowserAuthSession } from "@/features/auth/infrastructure/browser-auth-session";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export function AuthHeaderMenu() {
  const auth = useAuthSession();

  if (auth.status === "authenticated") {
    return (
      <details className="group relative text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 font-bold text-ink marker:content-none">
          <span className="grid size-6 place-items-center rounded-full bg-leaf-soft text-xs text-leaf-dark" aria-hidden="true">
            {auth.session.user.nickname.slice(0, 1)}
          </span>
          <span className="hidden sm:inline">{auth.session.user.nickname}님</span>
          <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-44 overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 shadow-xl">
          <Link className="block rounded-xl px-3 py-2.5 font-bold hover:bg-cream" href="/dashboard">내 텃밭 홈</Link>
          <Link className="block rounded-xl px-3 py-2.5 font-bold hover:bg-cream" href="/spaces">재배 공간</Link>
          <Link className="block rounded-xl px-3 py-2.5 font-bold hover:bg-cream" href="/seasons">재배 시즌</Link>
          <button className="mt-1 w-full border-t border-ink/10 px-3 py-2.5 text-left font-bold text-red-700" onClick={clearBrowserAuthSession} type="button">로그아웃</button>
        </div>
      </details>
    );
  }

  if (auth.status === "error") {
    return <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={clearBrowserAuthSession} type="button">세션 초기화</button>;
  }

  if (auth.status === "loading") {
    return <span className="px-4 py-2 text-sm text-muted">로그인 확인 중…</span>;
  }

  return <Link className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:text-leaf" href="/login">로그인</Link>;
}
