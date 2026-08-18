import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
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
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="배치 작물마다 반복 간격을 정하고 완료와 미루기 내역을 안전하게 남기세요."
        eyebrow="물주기 일정"
        heroSize="compact"
        title="오늘 줄 물과 다음 날짜를 기록해요"
        width="full"
      >
        <WateringManager seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
