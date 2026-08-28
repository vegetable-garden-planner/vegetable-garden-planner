import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
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
    <AuthGate loginHref={`/login?next=${encodeNextPath(path)}`}>
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="배치한 작물의 기준 시기와 시즌 기간을 맞춰 해야 할 일을 준비합니다."
        eyebrow="재배 일정 자동 생성"
        heroSize="compact"
        title="언제 무엇을 하면 될까요?"
        width="full"
      >
        <CultivationSchedule seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
