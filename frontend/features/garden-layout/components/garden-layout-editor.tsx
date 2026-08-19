"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { InlineConfirm } from "@/components/inline-confirm";
import { CropVisual } from "@/features/crop-catalog/components/crop-visual";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { calculatePlantCount, type PlantCountSummary as PlantCountSummaryValue } from "@/features/garden-layout/application/calculate-plant-count";
import { PlantCountSummary } from "@/features/garden-layout/components/plant-count-summary";
import {
  createGardenLayout,
  GRID_CELL_SIZE_OPTIONS,
  isGardenLayoutOutdated,
  toggleCropPlacement,
  type GardenLayout,
  type GridCellSizeCm,
} from "@/features/garden-layout/domain/garden-layout";
import { getCropSeasonFit, type CropSeasonFit } from "@/features/garden-layout/domain/garden-layout-rules";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import {
  deleteGardenLayout,
  putGardenLayout,
} from "@/features/garden-layout/infrastructure/garden-layout-api";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSeason } from "@/features/growing-season/domain/growing-season";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

export function GardenLayoutEditor({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const layoutsState = useGardenLayouts();
  const cropCatalog = useCropCatalog();

  if (seasonsState.status === "error") return <Message message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (layoutsState.status === "error") return <Message message={layoutsState.message} onRetry={() => void layoutsState.reload()} />;
  if (cropCatalog.status === "error") return <Message message={cropCatalog.message} onRetry={() => window.location.reload()} />;
  if (
    seasonsState.status === "loading"
    || spacesState.status === "loading"
    || layoutsState.status === "loading"
    || cropCatalog.status === "loading"
  ) {
    return <p className="surface-panel p-5 text-muted" role="status">배치 작업대를 준비하고 있습니다.</p>;
  }

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
      {layout
        ? <GardenGrid crops={compatibleCrops} layout={layout} reload={layoutsState.reload} season={season} space={space} />
        : (
            <>
              <PlannerContext season={season} space={space} />
              <GardenGridSetup reload={layoutsState.reload} seasonId={season.id} space={space} />
            </>
          )}
    </div>
  );
}

function PlannerContext({
  season,
  sidebar = false,
  space,
}: {
  season: GrowingSeason;
  sidebar?: boolean;
  space: GrowingSpace;
}) {
  return (
    <section className={`planner-context ${sidebar ? "planner-context-sidebar" : ""}`} aria-label="현재 텃밭 정보">
      <div><span>현재 텃밭</span><strong>{space.name}</strong></div>
      <dl>
        <div><dt>재배 시즌</dt><dd>{season.name}</dd></div>
        <div><dt>공간 크기</dt><dd>{space.widthCm} × {space.lengthCm}cm</dd></div>
        <div><dt>일조 환경</dt><dd>{sunlightLabel(space)}</dd></div>
      </dl>
      {sidebar && <Link href={`/spaces/${space.id}/edit`}>공간 정보 수정 <span aria-hidden="true">→</span></Link>}
    </section>
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
      {error && <p className="mt-4 rounded-xl bg-[#fff4f2] p-4 text-sm font-bold text-[var(--color-danger)]" role="alert">{error}</p>}
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
  const [confirmingReset, setConfirmingReset] = useState(false);
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
    setIsSaving(true);
    try {
      await deleteGardenLayout(layout);
      await reload();
      setConfirmingReset(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "격자를 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full">
      {outdated && <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800" role="alert">공간 크기가 격자를 만든 이후 변경되었습니다. 정확한 배치를 위해 격자를 다시 만들어 주세요.</p>}
      <section className="planner-workspace-tip" aria-label="배치 안내">
        <span aria-hidden="true">✦</span>
        <div><strong>햇빛 방향을 기준으로 배치하세요</strong><p>작물을 고른 다음 텃밭 칸을 누르면 바로 저장됩니다.</p></div>
      </section>
      <div className="planner-workspace">
        <div className="planner-left-rail">
          <PlannerContext season={season} sidebar space={space} />
          <CropSelectorPanel crops={crops} cropFits={cropFits} onSelect={setSelectedCropId} selectedCropId={selectedCropId} />
        </div>

        <section className="planner-board-panel" aria-labelledby="planner-board-title">
          <div className="planner-board-heading">
            <div><p>배치 보드</p><h2 id="planner-board-title">{space.name}</h2></div>
            <span>{layout.columns} × {layout.rows}칸</span>
          </div>
          {selectedCrop && selectedCropFit && (
            <p className={`planner-fit-message ${isCompleteSeasonFit(selectedCropFit) ? "planner-fit-good" : "planner-fit-warning"}`} role="status">
              {cropSeasonMessage(selectedCrop, selectedCropFit)}
            </p>
          )}
          <div className="planner-direction"><span />햇빛이 드는 방향<span /></div>
          <div className="planner-grid-scroll">
            <div className="planner-soil-frame">
              <div className="planner-grid" style={{ gridTemplateColumns: `repeat(${layout.columns}, 3rem)` }}>
                {Array.from({ length: layout.columns * layout.rows }, (_, cellIndex) => {
                  const placement = placementsByCell.get(cellIndex);
                  const crop = placement ? cropsById.get(placement.cropId) : undefined;
                  const row = Math.floor(cellIndex / layout.columns) + 1;
                  const column = (cellIndex % layout.columns) + 1;
                  const label = crop ? crop.name : "비어 있음";
                  return (
                    <button
                      aria-label={`${row}행 ${column}열, ${label}`}
                      className={`planner-cell ${crop ? "planner-cell-filled" : ""}`}
                      disabled={isSaving}
                      key={cellIndex}
                      onClick={() => void updateCell(cellIndex)}
                      title={`${row}행 ${column}열 · ${label}`}
                      type="button"
                    >
                      {crop ? <CropVisual compact crop={crop} /> : <span aria-hidden="true">+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="planner-board-footer">
            <p>한 칸 {layout.cellSizeCm}cm · 작물이 있는 칸을 다시 누르면 비워집니다.</p>
            <button disabled={isSaving} onClick={() => setConfirmingReset(true)} type="button">격자 초기화</button>
          </div>
          {confirmingReset && (
            <InlineConfirm
              confirmLabel="초기화하기"
              description="현재 작물 배치를 모두 지우고 격자를 다시 만듭니다. 되돌릴 수 없습니다."
              disabled={isSaving}
              onCancel={() => setConfirmingReset(false)}
              onConfirm={() => void recreateGrid()}
              title="격자를 초기화할까요?"
            />
          )}
        </section>

        <PlacementInspector plantCount={plantCount} selectedCrop={selectedCrop} />
      </div>
      {error && <p className="mt-4 rounded-xl bg-[#fff4f2] p-4 text-sm font-bold text-[var(--color-danger)]" role="alert">{error}</p>}
      <LayoutNextStep crops={crops} layout={layout} season={season} />
    </div>
  );
}

function CropSelectorPanel({
  cropFits,
  crops,
  onSelect,
  selectedCropId,
}: {
  cropFits: Map<string, CropSeasonFit>;
  crops: readonly CropReference[];
  onSelect: (cropId: string) => void;
  selectedCropId: string;
}) {
  return (
    <aside className="planner-crop-panel" aria-labelledby="crop-selector-title">
      <div className="planner-panel-heading">
        <div><p>재배할 작물</p><h2 id="crop-selector-title">작물을 선택하세요</h2></div>
        <span>{crops.length}종</span>
      </div>
      <div className="planner-crop-list" role="radiogroup" aria-labelledby="crop-selector-title">
        {crops.map((crop) => {
          const recommended = isCompleteSeasonFit(cropFits.get(crop.id));
          return (
            <label className={`planner-crop-choice ${cropChoiceClass(selectedCropId === crop.id, recommended)}`} key={crop.id}>
              <input checked={selectedCropId === crop.id} className="sr-only" name="crop" onChange={() => onSelect(crop.id)} type="radio" />
              <CropVisual crop={crop} />
              <span><strong>{crop.name}</strong><small>{recommended ? "현재 시즌 추천" : `${crop.plantingPeriod.label} 권장`}</small></span>
            </label>
          );
        })}
      </div>
    </aside>
  );
}

function PlacementInspector({
  plantCount,
  selectedCrop,
}: {
  plantCount: PlantCountSummaryValue;
  selectedCrop: CropReference | undefined;
}) {
  return (
    <aside className="planner-inspector">
      {selectedCrop && (
        <section className="planner-selected-crop" aria-labelledby="selected-crop-title">
          <p>선택한 작물</p>
          <div>
            <CropVisual crop={selectedCrop} />
            <span><strong id="selected-crop-title">{selectedCrop.name}</strong><small>{selectedCrop.plantingPeriod.label} 심기 권장</small></span>
          </div>
          <dl>
            <div><dt>권장 간격</dt><dd>{selectedCrop.plantSpacingCm}cm</dd></div>
            <div><dt>난이도</dt><dd>{difficultyLabel(selectedCrop.difficulty)}</dd></div>
          </dl>
        </section>
      )}
      <PlantCountSummary summary={plantCount} />
      <section className="planner-guide-card">
        <p>배치 가이드</p>
        <h2>{selectedCrop?.name ?? "작물"}을 심을 위치</h2>
        <ul>
          <li>햇빛 방향과 권장 시기를 먼저 확인하세요.</li>
          <li>각 칸은 한 포기로 계산됩니다.</li>
          <li>저장할 때 간격과 연작 위험을 함께 확인해요.</li>
        </ul>
      </section>
    </aside>
  );
}

function isCompleteSeasonFit(
  fit: { plantingDate: string | null; harvestDate: string | null } | undefined,
) {
  return Boolean(fit?.plantingDate && fit.harvestDate);
}

function cropChoiceClass(selected: boolean, recommended: boolean) {
  if (recommended) {
    return selected ? "planner-crop-selected" : "planner-crop-recommended";
  }
  return selected
    ? "planner-crop-selected planner-crop-offseason"
    : "planner-crop-offseason";
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

function Message({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-[#fff4f2] p-5 text-[var(--color-danger)]" role="alert">
      <p className="font-semibold">{message}</p>
      {onRetry ? (
        <button className="mt-4 inline-flex font-bold underline" onClick={onRetry} type="button">다시 시도</button>
      ) : (
        <Link className="mt-4 inline-flex font-bold underline" href="/seasons">시즌 목록으로 돌아가기</Link>
      )}
    </div>
  );
}

function sunlightLabel(space: GrowingSpace): string {
  if (space.estimatedSunlightHours !== null) return `하루 약 ${space.estimatedSunlightHours}시간`;
  if (space.sunlight === "full") return "햇빛 6시간 이상";
  if (space.sunlight === "partial") return "햇빛 2~5시간";
  return "햇빛 2시간 미만";
}

function difficultyLabel(difficulty: CropReference["difficulty"]): string {
  if (difficulty === "easy") return "쉬움";
  if (difficulty === "normal") return "보통";
  return "도전";
}
