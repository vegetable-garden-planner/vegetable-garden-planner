import { redirect } from "next/navigation";

/**
 * 예전 주소 (계획별 텃밭 격자 화면)
 *
 * 텃밭 격자도 같은 통합 배치 캔버스에서 다룬다.
 */
export default async function SeasonLayoutPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  redirect(`/placements?plan=${encodeURIComponent(seasonId)}`);
}
