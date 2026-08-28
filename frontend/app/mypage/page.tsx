import type { Metadata } from "next";
import Link from "next/link";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

export const metadata: Metadata = {
  title: "마이페이지 | 심어봄",
  description: "재배 화분과 재배 계획, 작물 배치 현황을 한곳에서 이어서 관리하세요.",
};

/**
 * 마이페이지 — 전체 재배 현황을 자세히 보는 곳
 *
 * 예전 /dashboard 화면을 그대로 옮겨 왔다. 계산 로직과 데이터 훅은
 * DashboardOverview 안의 것을 그대로 쓴다(복사하지 않는다).
 *
 * 홈(/dashboard)은 "지금 무엇을 키우는지"를 한 화면으로 보여 주고,
 * 여기는 목록·기록·진행 상황을 끝까지 확인하는 자리다.
 */
export default function MyPage() {
  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath("/mypage")}`}>
      <main className="app-page dashboard-page">
        <AppHeader
          action={<Link className="primary-action px-4 py-2.5 text-sm" href="/start">새 재배 시작</Link>}
          variant="overlay"
        />
        <DashboardOverview />
        <AppFooter />
      </main>
    </AuthGate>
  );
}
