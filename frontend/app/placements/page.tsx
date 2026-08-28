import type { Metadata } from "next";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { PlacementStudio } from "@/features/placement-studio/components/placement-studio";

export const metadata: Metadata = {
  title: "작물 배치 | 심어봄",
  description: "내 화분을 한 캔버스에 모아 놓고 작물을 직접 놓고, 옮기고, 재배 조건을 확인하세요.",
};

/**
 * 통합 배치 캔버스
 *
 * 배치 편집기의 최상위 단위는 재배 계획 하나가 아니라 사용자의 재배 공간 전체다.
 * 서로 다른 계획의 화분이 한 화면에 함께 보이고, 각 화분은 자기 계획을 그대로 유지한다.
 * ?plan=<재배 계획 id> 로 들어오면 그 계획만 걸러 보여 준다. (기본값은 전체)
 */
export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath("/placements")}`}>
      <PlacementStudio initialPlanId={plan} />
    </AuthGate>
  );
}
