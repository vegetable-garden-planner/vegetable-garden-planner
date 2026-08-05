"use client";

import Link from "next/link";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

export function SeasonList() {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();

  if (seasonsState.status === "error") {
    return <ErrorMessage message={seasonsState.message} />;
  }
  if (spacesState.status === "error") {
    return <ErrorMessage message={spacesState.message} />;
  }
  if (seasonsState.seasons.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-leaf/30 bg-white p-8 text-center">
        <h2 className="text-xl font-bold">아직 등록한 시즌이 없어요</h2>
        <p className="mt-3 text-muted">재배 기간을 등록하면 작물 배치와 일정 관리의 기준이 됩니다.</p>
        <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/seasons/new">첫 시즌 등록하기</Link>
      </div>
    );
  }

  const spaceNames = new Map(spacesState.spaces.map((space) => [space.id, space.name]));

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {seasonsState.seasons.map((season) => (
        <li className="rounded-3xl border border-ink/10 bg-white p-6" key={season.id}>
          <p className="text-sm font-bold text-leaf">{spaceNames.get(season.spaceId) ?? "연결된 공간을 찾을 수 없음"}</p>
          <h2 className="mt-2 text-xl font-bold">{season.name}</h2>
          <dl className="mt-5 text-sm">
            <dt className="text-muted">재배 기간</dt>
            <dd className="mt-1 font-bold">{season.startDate} ~ {season.endDate}</dd>
          </dl>
          {season.notes && <p className="mt-4 border-t border-ink/10 pt-4 text-sm leading-6 text-muted">{season.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{message}</p>;
}
