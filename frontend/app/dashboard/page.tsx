import type { Metadata } from "next";
import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

export const metadata: Metadata = {
  title: "나의 재배 홈 | 심어봄",
  description: "재배 공간과 시즌, 작물 배치 현황을 한곳에서 이어서 관리하세요.",
};

export default function DashboardPage() {
  return (
    <AuthGate loginHref="/login?next=%2Fdashboard">
      <AppPageShell
        action={<Link className="primary-action px-4 py-2.5 text-sm" href="/spaces/new">공간 추가</Link>}
        description="공간과 시즌, 오늘의 일정과 식물 기록을 한곳에서 이어서 관리하세요."
        eyebrow="나의 재배 홈"
        title="오늘의 텃밭을 살펴봐요"
        width="full"
      >
        <DashboardOverview />
      </AppPageShell>
    </AuthGate>
  );
}
