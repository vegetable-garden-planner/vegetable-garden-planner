import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { ContainerPlacementEditor } from "@/features/container-placement/components/container-placement-editor";

export const metadata: Metadata = {
  title: "화분 작물 배치 | 심어봄",
  description: "재배 시즌의 화분마다 키울 작물과 수량을 배치하세요.",
};

export default async function SeasonContainerPlacementsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/placements`;

  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath(path)}`}>
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="화분마다 작물과 수량을 추가하면 재배 일정을 만들 수 있습니다."
        eyebrow="화분 배치 작업대"
        heroSize="compact"
        title="화분 배치 조정"
        width="full"
      >
        <ContainerPlacementEditor seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
