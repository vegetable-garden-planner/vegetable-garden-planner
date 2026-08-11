import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { WateringManager } from "@/features/watering/components/watering-manager";

export const metadata: Metadata = {
  title: "물주기 관리 | 심어봄",
  description: "배치 작물별 물주기 반복 일정과 완료·미루기 이력을 관리하세요.",
};

export default async function SeasonWateringPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/watering`;

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(path)}`}>
      <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <AppHeader />
          <Link className="mt-8 inline-flex text-sm font-bold text-muted hover:text-leaf" href="/seasons">← 시즌 목록</Link>
          <div className="mb-8 mt-12 sm:mt-16">
            <p className="text-sm font-bold text-leaf">물주기 일정</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">오늘 줄 물과 다음 날짜를 기록해요</h1>
            <p className="mt-4 leading-7 text-muted">배치 작물마다 반복 간격을 정하고, 완료와 미루기 내역을 서버에 안전하게 남길 수 있습니다.</p>
          </div>
          <WateringManager seasonId={seasonId} />
        </div>
      </main>
    </AuthGate>
  );
}
