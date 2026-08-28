import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { GardenLayoutSummaryView } from "@/features/garden-layout/components/garden-layout-summary";

export const metadata: Metadata = {
  title: "텃밭 배치 결과 | 심어봄",
  description: "텃밭 칸마다 배치한 작물과 필요한 준비물을 한눈에 확인하세요.",
};

export default async function SeasonLayoutSummaryPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/layout/summary`;

  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath(path)}`}>
      <AppPageShell
        backHref={`/seasons/${seasonId}/layout`}
        backLabel="텃밭 배치 조정"
        description="내 텃밭에 무엇을 어디에 심었는지 한눈에 확인해보세요."
        eyebrow="텃밭 배치 결과"
        heroImage="/figma/planner-hero.webp"
        title="텃밭 배치·재배 계획"
        width="full"
      >
        <GardenLayoutSummaryView seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
