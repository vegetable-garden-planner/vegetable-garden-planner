"use client";

import Link from "next/link";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export function AuthHeaderMenu() {
  const auth = useAuthSession();

  async function handleWithdraw() {
    if (!window.confirm("정말 탈퇴하시겠어요? 다시 로그인할 수 없고, 그동안의 재배 기록은 보존됩니다.")) return;
    try {
      await auth.withdraw();
    } catch {
      window.alert("탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  if (auth.state.status === "authenticated") {
    return (
      <details className="group relative text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 font-bold text-ink marker:content-none">
          <span className="grid size-6 place-items-center rounded-full bg-leaf-soft text-xs text-leaf-dark" aria-hidden="true">{auth.state.user.nickname.slice(0, 1)}</span>
          <span className="hidden sm:inline">{auth.state.user.nickname}님</span>
          <span className="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-44 overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 text-ink shadow-xl">
          <Link className="block rounded-xl px-3 py-2.5 font-bold hover:bg-cream" href="/dashboard">내 텃밭 홈</Link>
          <Link className="block rounded-xl px-3 py-2.5 font-bold hover:bg-cream" href="/spaces">재배 공간</Link>
          <Link className="block rounded-xl px-3 py-2.5 font-bold hover:bg-cream" href="/seasons">재배 시즌</Link>
          <button className="w-full px-3 py-2.5 text-left font-bold text-red-700" onClick={() => void auth.logout()} type="button">로그아웃</button>
          <button className="w-full border-t border-ink/10 px-3 py-2.5 text-left font-bold text-muted" onClick={handleWithdraw} type="button">회원 탈퇴</button>
        </div>
      </details>
    );
  }

  if (auth.state.status === "error") {
    return <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={() => void auth.reload()} type="button">다시 시도</button>;
  }

  if (auth.state.status === "loading") return null;
  return <Link className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:text-leaf" href="/login">로그인</Link>;
}
