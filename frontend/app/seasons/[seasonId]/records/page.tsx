import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { SeasonTabs } from "@/components/season-tabs";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { CultivationRecordManager } from "@/features/cultivation-record/components/cultivation-record-manager";

export const metadata: Metadata = {
  title: "재배 기록 | 심어봄",
  description: "재배 작업과 성장 관찰, 수확 기록을 재배 계획별로 관리하세요.",
};

export default async function SeasonRecordsPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/records`;

  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath(path)}`}>
      <AppPageShell
        backHref="/seasons"
        backLabel="내 재배 계획"
        description="작업과 성장 관찰, 수확 기록을 남기고 한 번의 재배의 변화를 시간순으로 돌아보세요."
        eyebrow="재배 기록"
        heroSize="compact"
        title="한 일과 식물의 변화를 남겨요"
        width="full"
      >
        <SeasonTabs seasonId={seasonId} />
        <CultivationRecordManager seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
