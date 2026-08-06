import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

export const metadata: Metadata = {
  title: "나의 재배 홈 | 심어봄",
  description: "재배 공간과 시즌, 작물 배치 현황을 한곳에서 이어서 관리하세요.",
};

export default function DashboardPage() {
  return (
    <AuthGate loginHref="/login?next=%2Fdashboard">
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <AppHeader action={(
            <Link className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white" href="/spaces/new">
              공간 추가
            </Link>
          )} />
          <DashboardOverview />
        </div>
      </main>
    </AuthGate>
  );
}
