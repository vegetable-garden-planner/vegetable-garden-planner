"use client";

import Link from "next/link";
import { SeasonForm } from "@/features/growing-season/components/season-form";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";

export function SeasonEditor({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();

  if (seasonsState.status === "error") {
    return <Message message={seasonsState.message} />;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) {
    return <Message message="수정할 시즌을 찾을 수 없습니다." />;
  }

  return <SeasonForm initialSpaceId={season.spaceId} season={season} />;
}

function Message({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 p-5 text-red-700" role="alert">
      <p className="font-semibold">{message}</p>
      <Link className="mt-4 inline-flex font-bold underline" href="/seasons">시즌 목록으로 돌아가기</Link>
    </div>
  );
}
