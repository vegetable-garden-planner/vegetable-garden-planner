"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteGrowingSeasonWithRelations } from "@/features/growing-season/application/delete-growing-season";
import {
  getGrowingSeasonStatus,
  type GrowingSeason,
  type GrowingSeasonStatus,
} from "@/features/growing-season/domain/growing-season";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { GROWING_SEASONS_STORAGE_KEY } from "@/features/growing-season/infrastructure/season-storage";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { notifyBrowserStorageChange } from "@/shared/infrastructure/browser-storage-events";

const STATUS_LABELS: Record<GrowingSeasonStatus, string> = {
  planned: "예정",
  active: "진행 중",
  completed: "종료",
};

const STATUS_STYLES: Record<GrowingSeasonStatus, string> = {
  planned: "bg-sky-50 text-sky-700",
  active: "bg-leaf-soft text-leaf-dark",
  completed: "bg-stone-100 text-stone-600",
};

export function SeasonList() {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const [actionError, setActionError] = useState("");

  if (seasonsState.status === "error") return <ErrorMessage message={seasonsState.message} />;
  if (spacesState.status === "error") return <ErrorMessage message={spacesState.message} />;
  if (seasonsState.seasons.length === 0) return <EmptySeasonList />;

  const spacesById = new Map(spacesState.spaces.map((space) => [space.id, space]));
  const today = new Date().toISOString().slice(0, 10);

  function removeSeason(season: GrowingSeason) {
    setActionError("");
    if (!window.confirm(`'${season.name}' 시즌을 삭제할까요?`)) return;

    try {
      deleteGrowingSeasonWithRelations(window.localStorage, season.id);
      notifyBrowserStorageChange(GROWING_SEASONS_STORAGE_KEY);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "시즌을 삭제하지 못했습니다.");
    }
  }

  return (
    <div>
      {actionError && <ErrorMessage message={actionError} />}
      <ul className={`grid gap-4 sm:grid-cols-2 ${actionError ? "mt-4" : ""}`}>
        {seasonsState.seasons.map((season) => {
          const status = getGrowingSeasonStatus(season, today);
          const linkedSpace = spacesById.get(season.spaceId);
          return (
            <li className="rounded-3xl border border-ink/10 bg-white p-6" key={season.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-leaf">{linkedSpace?.name ?? "연결된 공간을 찾을 수 없음"}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
              </div>
              <h2 className="mt-2 text-xl font-bold">{season.name}</h2>
              <dl className="mt-5 text-sm">
                <dt className="text-muted">재배 기간</dt>
                <dd className="mt-1 font-bold">{season.startDate} ~ {season.endDate}</dd>
              </dl>
              {season.notes && <p className="mt-4 border-t border-ink/10 pt-4 text-sm leading-6 text-muted">{season.notes}</p>}
              <div className="mt-6 flex gap-2 border-t border-ink/10 pt-4">
                <Link className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold" href={`/seasons/${season.id}/edit`}>수정</Link>
                <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={() => removeSeason(season)} type="button">삭제</button>
                {linkedSpace?.type === "garden" && <Link className="ml-auto rounded-full bg-leaf-soft px-4 py-2 text-sm font-bold text-leaf-dark" href={`/seasons/${season.id}/layout`}>작물 배치</Link>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptySeasonList() {
  return (
    <div className="rounded-3xl border border-dashed border-leaf/30 bg-white p-8 text-center">
      <h2 className="text-xl font-bold">아직 등록한 시즌이 없어요</h2>
      <p className="mt-3 text-muted">재배 기간을 등록하면 작물 배치와 일정 관리의 기준이 됩니다.</p>
      <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/seasons/new">첫 시즌 등록하기</Link>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{message}</p>;
}
