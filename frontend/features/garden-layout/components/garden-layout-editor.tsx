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
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import {
  deleteGardenLayout,
  putGardenLayout,
} from "@/features/garden-layout/infrastructure/garden-layout-api";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
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

  const gardenCrops = cropCatalog.crops.filter((crop) => crop.supportedSpaces.includes("garden"));

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="작물 배치를 만들 시즌을 찾을 수 없습니다." />;

  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <Message message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;
  if (space.type !== "garden") {
    return <Message message="격자 배치는 마당·텃밭 유형의 공간에서 사용할 수 있습니다." />;
  }

  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  return (
    <div>
      <div className="mb-6 rounded-2xl bg-leaf-soft/60 p-5">
        <p className="text-sm font-bold text-leaf">{space.name} · {season.name}</p>
        <p className="mt-2 text-sm text-muted">공간 크기 {space.widthCm} × {space.lengthCm}cm</p>
      </div>
      {layout
        ? <GardenGrid crops={gardenCrops} layout={layout} reload={layoutsState.reload} space={space} />
        : <GardenGridSetup reload={layoutsState.reload} seasonId={season.id} space={space} />}
    </div>
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
    <form className="rounded-3xl border border-ink/10 bg-white p-6" onSubmit={submit}>
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
  space,
}: {
  crops: readonly CropReference[];
  layout: GardenLayout;
  reload: () => Promise<void>;
  space: GrowingSpace;
}) {
  const [selectedCropId, setSelectedCropId] = useState(crops[0]?.id ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  const placementsByCell = new Map(
    layout.placements.map((placement) => [placement.cellIndex, placement]),
  );
  const outdated = isGardenLayoutOutdated(layout, space);
  const plantCount = calculatePlantCount(layout.placements, crops);

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
    <div>
      {outdated && <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800" role="alert">공간 크기가 격자를 만든 이후 변경되었습니다. 정확한 배치를 위해 격자를 다시 만들어 주세요.</p>}
      <section className="rounded-3xl border border-ink/10 bg-white p-5" aria-labelledby="crop-selector-title">
        <h2 className="text-lg font-bold" id="crop-selector-title">배치할 작물</h2>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-labelledby="crop-selector-title">
          {crops.map((crop) => (
            <label className={`relative shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-bold ${selectedCropId === crop.id ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-ink/10"}`} key={crop.id}>
              <input checked={selectedCropId === crop.id} className="sr-only" name="crop" onChange={() => setSelectedCropId(crop.id)} type="radio" />
              {crop.name}
            </label>
          ))}
        </div>
      </section>

      <div className="mt-5 overflow-x-auto rounded-3xl border-4 border-[#8a684a] bg-[#d6c39c] p-3">
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
    </div>
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
