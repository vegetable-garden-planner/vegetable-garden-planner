"use client";

import Link from "next/link";
import { useState } from "react";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import {
  type PersistedGrowingSeason,
  type GrowingSeasonStatus,
} from "@/features/growing-season/domain/growing-season";
import { getSeasonNextStep } from "@/features/growing-season/domain/season-next-step";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { deleteGrowingSeason } from "@/features/growing-season/infrastructure/season-api";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

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

export function SeasonList({ selectedSpaceId = "" }: { selectedSpaceId?: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const cropCatalog = useCropCatalog();
  const layoutsState = useGardenLayouts();
  const [actionError, setActionError] = useState("");

  if (seasonsState.status === "error") return <ErrorMessage message={seasonsState.message} />;
  if (spacesState.status === "error") return <ErrorMessage message={spacesState.message} />;
  if (cropCatalog.status === "error") return <ErrorMessage message={cropCatalog.message} />;
  if (layoutsState.status === "error") return <ErrorMessage message={layoutsState.message} />;
  if (layoutsState.status === "loading") return <p className="text-muted">시즌의 다음 단계를 확인하고 있습니다.</p>;
  const spacesById = new Map(spacesState.spaces.map((space) => [space.id, space]));
  const cropsById = new Map(cropCatalog.crops.map((crop) => [crop.id, crop]));
  const layoutsBySeasonId = new Map(
    layoutsState.layouts.map((layout) => [layout.seasonId, layout]),
  );
  const selectedSpace = selectedSpaceId ? spacesById.get(selectedSpaceId) : undefined;
  if (selectedSpaceId && !selectedSpace) {
    return <InvalidSpaceFilter />;
  }

  const visibleSeasons = selectedSpaceId
    ? seasonsState.seasons.filter((season) => season.spaceId === selectedSpaceId)
    : seasonsState.seasons;
  if (visibleSeasons.length === 0) {
    return <EmptySeasonList selectedSpaceId={selectedSpaceId} spaceName={selectedSpace?.name} />;
  }

  async function removeSeason(season: PersistedGrowingSeason) {
    setActionError("");
    if (!window.confirm(`'${season.name}' 시즌을 삭제할까요?`)) return;

    try {
      await deleteGrowingSeason(season);
      await seasonsState.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "시즌을 삭제하지 못했습니다.");
    }
  }

  return (
    <div>
      {selectedSpace && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-leaf-soft/60 p-4">
          <p className="font-bold">‘{selectedSpace.name}’에서 키우는 시즌 {visibleSeasons.length}개</p>
          <Link className="text-sm font-bold text-leaf underline" href="/seasons">전체 시즌 보기</Link>
        </div>
      )}
      {actionError && <ErrorMessage message={actionError} />}
      <ul className={`grid gap-4 sm:grid-cols-2 ${actionError ? "mt-4" : ""}`}>
        {visibleSeasons.map((season) => {
          const status = season.status;
          const linkedSpace = spacesById.get(season.spaceId);
          const featuredCrop = season.featuredCropId
            ? cropsById.get(season.featuredCropId)
            : undefined;
          const nextStep = getSeasonNextStep(
            season,
            linkedSpace?.type ?? "garden",
            layoutsBySeasonId.get(season.id),
          );
          return (
            <li className="surface-panel relative overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" key={season.id}>
              <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-primary),var(--color-secondary))]" aria-hidden="true" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-leaf">{linkedSpace?.name ?? "연결된 공간을 찾을 수 없음"}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
              </div>
              <h2 className="mt-2 text-xl font-bold">{season.name}</h2>
              {featuredCrop && <Link className="mt-2 inline-flex text-sm font-bold text-leaf underline" href={`/crops/${featuredCrop.id}`}>선택 식물 · {featuredCrop.name}</Link>}
              <dl className="mt-5 text-sm">
                <dt className="text-muted">재배 기간</dt>
                <dd className="mt-1 font-bold">{season.startDate} ~ {season.endDate}</dd>
              </dl>
              {season.notes && <p className="mt-4 border-t border-ink/10 pt-4 text-sm leading-6 text-muted">{season.notes}</p>}
              <section className="mt-5 rounded-2xl bg-leaf-soft/70 p-4" aria-label={`${season.name} 다음 단계`}>
                <p className="text-sm font-bold text-leaf-dark">{nextStep.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{nextStep.description}</p>
                <Link className="mt-3 inline-flex rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white hover:bg-leaf-dark" href={nextStep.href}>{nextStep.label} →</Link>
              </section>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                <Link className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold" href={`/seasons/${season.id}/edit`}>수정</Link>
                <Link className="rounded-full border border-leaf/20 px-4 py-2 text-sm font-bold text-leaf-dark" href={`/seasons/${season.id}/records`}>시즌 기록</Link>
                <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={() => void removeSeason(season)} type="button">삭제</button>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Link className="rounded-full border border-leaf/20 px-4 py-2 text-sm font-bold text-leaf-dark" href={`/seasons/${season.id}/watering`}>물주기</Link>
                  <Link className="rounded-full border border-leaf/20 px-4 py-2 text-sm font-bold text-leaf-dark" href={`/seasons/${season.id}/tasks`}>재배 일정</Link>
                  {linkedSpace?.type === "garden" && <Link className="rounded-full bg-leaf-soft px-4 py-2 text-sm font-bold text-leaf-dark" href={`/seasons/${season.id}/layout`}>작물 배치</Link>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptySeasonList({
  selectedSpaceId = "",
  spaceName,
}: {
  selectedSpaceId?: string;
  spaceName?: string;
}) {
  const newSeasonHref = selectedSpaceId
    ? `/seasons/new?spaceId=${encodeURIComponent(selectedSpaceId)}`
    : "/seasons/new";
  return (
    <div className="surface-panel border-dashed p-8 text-center">
      <h2 className="text-xl font-bold">{spaceName ? `‘${spaceName}’에 등록한 시즌이 없어요` : "아직 등록한 시즌이 없어요"}</h2>
      <p className="mt-3 text-muted">재배 기간을 등록하면 식물 배치와 일정 관리의 기준이 됩니다.</p>
      <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href={newSeasonHref}>첫 시즌 등록하기</Link>
      {selectedSpaceId && <Link className="ml-3 mt-6 inline-flex px-3 py-3 text-sm font-bold text-muted underline" href="/seasons">전체 시즌 보기</Link>}
    </div>
  );
}

function InvalidSpaceFilter() {
  return (
    <div className="surface-panel border-dashed border-red-200 p-8 text-center">
      <h2 className="text-xl font-bold">선택한 공간을 찾을 수 없어요</h2>
      <p className="mt-3 text-muted">공간이 삭제되었거나 주소가 올바르지 않습니다.</p>
      <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/spaces">내 공간으로 돌아가기</Link>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{message}</p>;
}
