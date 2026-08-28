import type { Metadata } from "next";
import Link from "next/link";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

export const metadata: Metadata = {
  title: "나의 재배 홈 | 심어봄",
  description: "재배 공간과 시즌, 작물 배치 현황을 한곳에서 이어서 관리하세요.",
};

export default function DashboardPage() {
  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath("/dashboard")}`}>
      <main className="app-page dashboard-page">
        <AppHeader
          action={<Link className="primary-action px-4 py-2.5 text-sm" href="/spaces/new">공간 추가</Link>}
          variant="overlay"
        />
        <DashboardOverview />
        <AppFooter />
      </main>
    </AuthGate>
  );
}
