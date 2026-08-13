import type { Metadata } from "next";
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
      <GardenLayoutEditor seasonId={seasonId} />
    </AuthGate>
  );
}
