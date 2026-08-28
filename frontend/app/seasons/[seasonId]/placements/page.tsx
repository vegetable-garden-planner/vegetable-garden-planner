import { redirect } from "next/navigation";

/**
 * 예전 주소 (계획별 배치 화면)
 *
 * 배치 편집기는 이제 계획마다 따로 있는 화면이 아니라 하나의 통합 캔버스다.
 * 기존 링크는 그 계획을 선택한 상태의 통합 화면으로 보낸다.
 */
export default async function SeasonPlacementsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  redirect(`/placements?plan=${encodeURIComponent(seasonId)}`);
}
