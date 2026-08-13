"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { CropCategory, CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { calculatePlantCount } from "@/features/garden-layout/application/calculate-plant-count";
import { PlantCountSummary } from "@/features/garden-layout/components/plant-count-summary";
import {
  createGardenLayout,
  GRID_CELL_SIZE_OPTIONS,
  isGardenLayoutOutdated,
  toggleCropPlacement,
  type GardenLayout,
  type GridCellSizeCm,
} from "@/features/garden-layout/domain/garden-layout";
import { getCropSeasonFit } from "@/features/garden-layout/domain/garden-layout-rules";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import {
  deleteGardenLayout,
  putGardenLayout,
} from "@/features/garden-layout/infrastructure/garden-layout-api";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSeason } from "@/features/growing-season/domain/growing-season";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

const CROP_TONES: Record<CropCategory, string> = {
  leaf: "bg-[#75a960] text-white",
  fruit: "bg-[#d66551] text-white",
  root: "bg-[#e59b47] text-white",
  legume: "bg-[#8b7bb8] text-white",
  tuber: "bg-[#a87a55] text-white",
  flower: "bg-[#c56b91] text-white",
};

export function GardenLayoutEditor({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const layoutsState = useGardenLayouts();
  const cropCatalog = useCropCatalog();

  if (seasonsState.status === "error") return <Message message={seasonsState.message} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} />;
  if (layoutsState.status === "error") return <Message message={layoutsState.message} />;
  if (layoutsState.status === "loading") return <p className="text-muted">작물 배치를 불러오고 있습니다.</p>;
  if (cropCatalog.status === "error") return <Message message={cropCatalog.message} />;
  if (cropCatalog.status === "loading") return <p className="text-muted">작물 정보를 불러오고 있습니다.</p>;

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="작물 배치를 만들 시즌을 찾을 수 없습니다." />;

  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <Message message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;
  if (space.type !== "garden") {
    return <ContainerSpaceNextStep season={season} space={space} />;
  }
  const compatibleCrops = cropCatalog.crops.filter((crop) => crop.supportedSpaces.includes(space.type));

  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-6 rounded-2xl bg-leaf-soft/60 p-5">
        <p className="text-sm font-bold text-leaf">{space.name} · {season.name}</p>
        <p className="mt-2 text-sm text-muted">공간 크기 {space.widthCm} × {space.lengthCm}cm</p>
      </div>
      {layout
        ? <GardenGrid crops={compatibleCrops} layout={layout} reload={layoutsState.reload} season={season} space={space} />
        : <GardenGridSetup reload={layoutsState.reload} seasonId={season.id} space={space} />}
    </div>
  );
}

function ContainerSpaceNextStep({ season, space }: { season: GrowingSeason; space: GrowingSpace }) {
  const hasCrop = Boolean(season.featuredCropId);

  return (
    <section className="surface-panel border-leaf/20 p-7 text-center">
      <p className="text-sm font-bold text-leaf">{space.name} · 화분·베란다 재배</p>
      <h2 className="mt-2 text-2xl font-bold">격자를 만들지 않고 다음 단계로 진행해요</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
        격자 배치는 여러 구역에 작물을 나누어 심는 마당·텃밭 전용 기능입니다.
        화분·베란다는 이번 시즌에 키울 작물을 선택한 뒤 바로 재배 일정을 만듭니다.
      </p>
      <Link
        className="mt-6 inline-flex rounded-full bg-leaf px-6 py-3 font-bold text-white"
        href={hasCrop ? `/seasons/${season.id}/tasks` : `/seasons/${season.id}/edit`}
      >
        {hasCrop ? "다음 단계 · 재배 일정 만들기" : "다음 단계 · 키울 작물 선택하기"} →
      </Link>
    </section>
  );
}

function GardenGridSetup({
  seasonId,
  reload,
  space,
}: {
  seasonId: string;
  reload: () => Promise<void>;
  space: GrowingSpace;
}) {
  const [cellSizeCm, setCellSizeCm] = useState<GridCellSizeCm>(25);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setError("");
    const result = createGardenLayout(
      seasonId,
      space.id,
      space.widthCm,
      space.lengthCm,
      cellSizeCm,
      new Date().toISOString(),
    );
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setIsSaving(true);
    try {
      await putGardenLayout(result.layout);
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "격자를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function selectCellSize(value: string) {
    const parsed = Number(value);
    const option = GRID_CELL_SIZE_OPTIONS.find((item) => item === parsed);
    if (option) setCellSizeCm(option);
  }

  const columns = Math.floor(space.widthCm / cellSizeCm);
  const rows = Math.floor(space.lengthCm / cellSizeCm);

  return (
    <form className="surface-panel p-6" onSubmit={submit}>
      <h2 className="text-xl font-bold">격자 칸 크기를 정해 주세요</h2>
      <p className="mt-3 text-sm leading-6 text-muted">작은 칸은 세밀하지만 격자 수가 많아집니다. 최대 400칸까지 만들 수 있습니다.</p>
      <label className="mt-6 block">
        <span className="mb-2 block font-bold">한 칸 크기</span>
        <select className="form-input" onChange={(event) => selectCellSize(event.target.value)} value={cellSizeCm}>
          {GRID_CELL_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} × {size}cm</option>)}
        </select>
      </label>
      <p className="mt-4 rounded-xl bg-cream p-4 text-sm font-bold">예상 격자: {columns}열 × {rows}행 · {columns * rows}칸</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{error}</p>}
      <button className="mt-6 w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? "저장 중" : "격자 만들기"}</button>
    </form>
  );
}

function GardenGrid({
  crops,
  layout,
  reload,
  season,
  space,
}: {
  crops: readonly CropReference[];
  layout: GardenLayout;
  reload: () => Promise<void>;
  season: GrowingSeason;
  space: GrowingSpace;
}) {
  const [selectedCropId, setSelectedCropId] = useState(
    crops.find((crop) => isCompleteSeasonFit(getCropSeasonFit(season, crop)))?.id
      ?? crops[0]?.id
      ?? "",
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  const cropFits = new Map(crops.map((crop) => [crop.id, getCropSeasonFit(season, crop)]));
  const placementsByCell = new Map(
    layout.placements.map((placement) => [placement.cellIndex, placement]),
  );
  const outdated = isGardenLayoutOutdated(layout, space);
  const plantCount = calculatePlantCount(layout.placements, crops);
  const selectedCrop = cropsById.get(selectedCropId);
  const selectedCropFit = cropFits.get(selectedCropId);

  async function updateCell(cellIndex: number) {
    if (isSaving) return;
    setError("");
    setIsSaving(true);
    try {
      const updated = toggleCropPlacement(
        layout,
        cellIndex,
        selectedCropId,
        crops.map((crop) => crop.id),
        new Date().toISOString(),
      );
      await putGardenLayout(updated);
      await reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "작물을 배치하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function recreateGrid() {
    if (isSaving) return;
    if (!window.confirm("현재 작물 배치를 모두 지우고 격자를 다시 만들까요?")) return;
    setIsSaving(true);
    try {
      await deleteGardenLayout(layout);
      await reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "격자를 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full">
      {outdated && <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800" role="alert">공간 크기가 격자를 만든 이후 변경되었습니다. 정확한 배치를 위해 격자를 다시 만들어 주세요.</p>}
      <section className="surface-panel min-w-0 max-w-full overflow-hidden p-5" aria-labelledby="crop-selector-title">
        <h2 className="text-lg font-bold" id="crop-selector-title">배치할 작물</h2>
        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1" role="radiogroup" aria-labelledby="crop-selector-title">
          {crops.map((crop) => (
            <label className={`shrink-0 cursor-pointer rounded-2xl border px-4 py-2 text-sm font-bold ${cropChoiceClass(selectedCropId === crop.id, isCompleteSeasonFit(cropFits.get(crop.id)))}`} key={crop.id}>
              <input checked={selectedCropId === crop.id} className="sr-only" name="crop" onChange={() => setSelectedCropId(crop.id)} type="radio" />
              <span className="block">{crop.name}</span>
              <span className="mt-0.5 block text-[0.68rem] font-semibold opacity-75">{isCompleteSeasonFit(cropFits.get(crop.id)) ? "현재 시즌 추천" : "다른 시기 권장"} · 심기 {crop.plantingPeriod.label}</span>
            </label>
          ))}
        </div>
        {selectedCrop && selectedCropFit && (
          <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${isCompleteSeasonFit(selectedCropFit) ? "bg-leaf-soft/60 text-leaf-dark" : "bg-amber-50 text-amber-900"}`} role="status">
            {cropSeasonMessage(selectedCrop, selectedCropFit)}
          </p>
        )}
      </section>

      <div className="mt-5 max-w-full overflow-x-auto overscroll-x-contain rounded-3xl border-4 border-[#8a684a] bg-[#d6c39c] p-3">
        <div
          className="grid w-max gap-1"
          style={{ gridTemplateColumns: `repeat(${layout.columns}, 2.75rem)` }}
        >
          {Array.from({ length: layout.columns * layout.rows }, (_, cellIndex) => {
            const placement = placementsByCell.get(cellIndex);
            const crop = placement ? cropsById.get(placement.cropId) : undefined;
            const row = Math.floor(cellIndex / layout.columns) + 1;
            const column = (cellIndex % layout.columns) + 1;
            const label = crop ? crop.name : "비어 있음";
            return (
              <button
                aria-label={`${row}행 ${column}열, ${label}`}
                className={`grid size-11 place-items-center rounded-md border border-white/50 text-xs font-bold ${crop ? CROP_TONES[crop.category] : "bg-white/55 text-[#70573f]"}`}
                disabled={isSaving}
                key={cellIndex}
                onClick={() => void updateCell(cellIndex)}
                title={`${row}행 ${column}열 · ${label}`}
                type="button"
              >
                {crop ? crop.name.slice(0, 1) : "·"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-bold text-muted">{layout.columns}열 × {layout.rows}행 · 한 칸 {layout.cellSizeCm}cm</p>
        <button className="rounded-full border border-red-200 px-4 py-2 font-bold text-red-700 disabled:opacity-60" disabled={isSaving} onClick={() => void recreateGrid()} type="button">격자 다시 만들기</button>
      </div>
      <PlantCountSummary summary={plantCount} />
      <p className="mt-3 text-sm text-muted">선택한 작물을 빈 칸에 배치하세요. 같은 작물이 있는 칸을 다시 누르면 제거됩니다.</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{error}</p>}
      <LayoutNextStep crops={crops} layout={layout} season={season} />
    </div>
  );
}

function isCompleteSeasonFit(
  fit: { plantingDate: string | null; harvestDate: string | null } | undefined,
) {
  return Boolean(fit?.plantingDate && fit.harvestDate);
}

function cropChoiceClass(selected: boolean, recommended: boolean) {
  if (recommended) {
    return selected ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-ink/10";
  }
  return selected
    ? "border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-200"
    : "border-amber-300 bg-amber-50 text-amber-900";
}

function cropSeasonMessage(
  crop: CropReference,
  fit: { plantingDate: string | null; harvestDate: string | null },
) {
  if (isCompleteSeasonFit(fit)) {
    return `${crop.name}은 현재 시즌에 심기와 수확 일정을 모두 만들 수 있습니다.`;
  }
  if (fit.plantingDate) {
    return `${crop.name}은 심을 수 있지만 권장 수확 시기(${crop.harvestPeriod.label})가 현재 시즌에 포함되지 않습니다. 배치는 가능하지만 자동 일정은 만들 수 없습니다.`;
  }
  return `${crop.name}의 권장 심기 시기는 ${crop.plantingPeriod.label}입니다. 현재 시즌에는 자동 일정을 만들 수 없지만 배치는 가능합니다.`;
}

function LayoutNextStep({
  crops,
  layout,
  season,
}: {
  crops: readonly CropReference[];
  layout: GardenLayout;
  season: GrowingSeason;
}) {
  if (layout.placements.length === 0) {
    return (
      <section className="surface-panel mt-6 border-dashed p-6" aria-labelledby="layout-next-step-title">
        <p className="text-sm font-bold text-leaf">다음 단계</p>
        <h2 className="mt-1 text-xl font-bold" id="layout-next-step-title">작물을 먼저 배치해 주세요</h2>
        <p className="mt-2 text-sm leading-6 text-muted">한 칸 이상 작물을 배치하면 해당 작물과 시즌 기간에 맞는 재배 일정을 만들 수 있습니다.</p>
      </section>
    );
  }

  const placedCropIds = new Set(layout.placements.map((placement) => placement.cropId));
  const scheduleIssues = crops.flatMap((crop) => {
    if (!placedCropIds.has(crop.id)) return [];
    const fit = getCropSeasonFit(season, crop);
    if (!fit.plantingDate) return [`${crop.name}: 권장 심기 ${crop.plantingPeriod.label}`];
    if (!fit.harvestDate) return [`${crop.name}: 권장 수확 ${crop.harvestPeriod.label}`];
    return [];
  });

  if (scheduleIssues.length > 0) {
    return (
      <section className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-6" aria-labelledby="layout-next-step-title">
        <p className="text-sm font-bold text-amber-800">자동 일정 전에 확인해 주세요</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-950" id="layout-next-step-title">현재 시즌과 권장 시기가 맞지 않아요</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">작물을 키우지 못하게 막는 것은 아니지만, 지금 기간으로는 신뢰할 수 있는 자동 일정을 만들 수 없습니다.</p>
        <ul className="mt-4 space-y-1 text-sm font-bold text-amber-950">
          {scheduleIssues.map((issue) => <li key={issue}>· {issue}</li>)}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="rounded-full bg-amber-900 px-5 py-3 text-sm font-bold text-white" href={`/seasons/${season.id}/edit`}>시즌 기간 수정하기</Link>
          <Link className="rounded-full border border-amber-400 bg-white px-5 py-3 text-sm font-bold text-amber-950" href="#crop-selector-title">다른 작물 선택하기</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl bg-[#0f513f] p-6 text-white shadow-[var(--shadow-md)] sm:flex sm:items-center sm:justify-between sm:gap-6" aria-labelledby="layout-next-step-title">
      <div>
        <p className="text-sm font-bold text-[#ffd26f]">작물 배치 완료 · 다음 단계</p>
        <h2 className="mt-2 text-2xl font-bold" id="layout-next-step-title">작물별 재배 일정을 만들어 보세요</h2>
        <p className="mt-2 text-sm leading-6 text-white/80">배치한 작물과 시즌 기간을 기준으로 심기와 수확 일정을 자동으로 준비합니다.</p>
      </div>
      <Link
        className="mt-5 inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3.5 font-bold text-[#0f513f] transition hover:bg-[#eef8f3] sm:mt-0"
        href={`/seasons/${season.id}/tasks`}
      >
        작물별 일정 만들기 →
      </Link>
    </section>
  );
}

function Message({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 p-5 text-red-700" role="alert">
      <p className="font-semibold">{message}</p>
      <Link className="mt-4 inline-flex font-bold underline" href="/seasons">시즌 목록으로 돌아가기</Link>
    </div>
  );
}
