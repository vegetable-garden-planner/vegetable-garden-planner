import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { CultivationRecordManager } from "@/features/cultivation-record/components/cultivation-record-manager";

export const metadata: Metadata = {
  title: "시즌 기록 | 심어봄",
  description: "재배 작업과 성장 관찰, 수확 기록을 시즌별로 관리하세요.",
};

export default async function SeasonRecordsPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/records`;

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(path)}`}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <AppHeader />
          <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/seasons">← 시즌 목록</Link>
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">시즌 기록</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">한 일과 식물의 변화를 남겨요</h1>
            <p className="mt-4 leading-7 text-muted">작업·성장 관찰·수확 기록을 서버에 저장하고 시즌의 변화를 시간순으로 확인할 수 있습니다.</p>
          </div>
          <CultivationRecordManager seasonId={seasonId} />
        </div>
      </main>
    </AuthGate>
  );
}
