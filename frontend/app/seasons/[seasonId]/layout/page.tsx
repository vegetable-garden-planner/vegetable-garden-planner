import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { GardenLayoutEditor } from "@/features/garden-layout/components/garden-layout-editor";

export const metadata: Metadata = {
  title: "텃밭 작물 배치 | 심어봄",
  description: "재배 시즌의 텃밭 격자를 만들고 작물을 배치하세요.",
};

export default async function SeasonLayoutPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const path = `/seasons/${seasonId}/layout`;

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(path)}`}>
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="작물을 선택하고 텃밭 칸을 눌러 원하는 위치에 배치해 보세요. 포기 수와 계절 적합도를 바로 확인할 수 있습니다."
        eyebrow="작물 배치 작업대"
        heroSize="compact"
        title="텃밭 배치 조정"
        width="full"
      >
        <GardenLayoutEditor seasonId={seasonId} />
      </AppPageShell>
    </AuthGate>
  );
}
