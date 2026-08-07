import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { CultivationSchedule } from "@/features/cultivation-schedule/components/cultivation-schedule";

export const metadata: Metadata = {
  title: "재배 일정 | 심어봄",
  description: "배치한 작물과 시즌 기간을 기준으로 재배 일정을 만드세요.",
};

export default async function SeasonTasksPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/tasks`;

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(path)}`}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <AppHeader />
          <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/seasons">← 시즌 목록</Link>
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">재배 일정 자동 생성</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">언제 무엇을 하면 될까요?</h1>
            <p className="mt-4 leading-7 text-muted">배치한 작물의 기준 시기와 시즌 기간을 맞춰 첫 관리 일정을 준비합니다.</p>
          </div>
          <CultivationSchedule seasonId={seasonId} />
        </div>
      </main>
    </AuthGate>
  );
}
