import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { SeasonEditor } from "@/features/growing-season/components/season-editor";

export const metadata: Metadata = {
  title: "재배 시즌 수정 | 심어봄",
  description: "등록한 재배 시즌 정보를 수정하세요.",
};

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const loginHref = `/login?next=${encodeNextPath(`/seasons/${seasonId}/edit`)}`;

  return (
    <AuthGate loginHref={loginHref}>
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="기간과 연결 공간을 바꾸면 이후 일정과 기록의 기준도 함께 달라집니다."
        eyebrow="재배 시즌 관리"
        heroSize="compact"
        title="시즌 정보를 수정해요"
        width="full"
      >
        <SeasonEditor seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
