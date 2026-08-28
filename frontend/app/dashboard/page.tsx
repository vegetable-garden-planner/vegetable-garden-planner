import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { HomeStage } from "@/features/home/components/home-stage";

export const metadata: Metadata = {
  title: "나의 재배 홈 | 심어봄",
  description: "지금 키우고 있는 재배 계획을 한 화면에서 확인하세요.",
};

/**
 * 메인 홈 — 한 화면 안에서 지금 키우는 재배 계획만 보여 준다.
 * 관리에 필요한 자세한 목록(해야 할 일, 최근 기록, 관리 중인 작물)은 /mypage 에 있다.
 */
export default function DashboardPage() {
  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath("/dashboard")}`}>
      <main className="app-page home-page">
        <AppHeader
          action={<Link className="app-header-quiet-link" href="/mypage">마이페이지</Link>}
        />
        <HomeStage />
      </main>
    </AuthGate>
  );
}
