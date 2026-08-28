import type { Metadata } from "next";
import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { SeasonList } from "@/features/growing-season/components/season-list";

export const metadata: Metadata = {
  title: "내 재배 계획 | 심어봄",
  description: "화분과 공간별 재배 계획을 한곳에서 관리하세요.",
};

export default async function SeasonsPage(props: PageProps<"/seasons">) {
  const query = await props.searchParams;
  const selectedSpaceId = typeof query.spaceId === "string" ? query.spaceId : "";
  const returnPath = selectedSpaceId
    ? `/seasons?spaceId=${encodeURIComponent(selectedSpaceId)}`
    : "/seasons";

  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath(returnPath)}`}>
      <AppPageShell
        action={<Link className="primary-action px-4 py-2.5 text-sm" href="/start">새 재배 시작</Link>}
        description="재배 기간을 정하면 작물 배치와 관리 일정, 성장 기록이 하나의 흐름으로 이어집니다."
        eyebrow="나의 재배 계획"
        heroSize="compact"
        title="언제 무엇을 키울지 준비해요"
        width="full"
      >
        <SeasonList selectedSpaceId={selectedSpaceId} />
      </AppPageShell>
    </AuthGate>
  );
}
