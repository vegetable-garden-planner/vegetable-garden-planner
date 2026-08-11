import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
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
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="작업과 성장 관찰, 수확 기록을 남기고 한 시즌의 변화를 시간순으로 돌아보세요."
        eyebrow="시즌 기록"
        title="한 일과 식물의 변화를 남겨요"
        width="medium"
      >
        <CultivationRecordManager seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
