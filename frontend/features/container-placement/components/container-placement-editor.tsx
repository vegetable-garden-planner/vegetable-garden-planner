"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import {
  toEditableRows,
  toPlacementInputs,
  validatePlacementRows,
  type ContainerPlacementRow,
  type ContainerPlacements,
} from "@/features/container-placement/domain/container-placement";
import { useContainerPlacements } from "@/features/container-placement/hooks/use-container-placements";
import { putContainerPlacements } from "@/features/container-placement/infrastructure/container-placement-api";
import type { PersistedGrowingSeason } from "@/features/growing-season/domain/growing-season";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

let rowKeySeed = 0;
function nextRowKey(): string {
  rowKeySeed += 1;
  return `new-${rowKeySeed}`;
}

export function ContainerPlacementEditor({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const cropCatalog = useCropCatalog();
  const placementsState = useContainerPlacements(seasonId);

  if (seasonsState.status === "error") return <Message message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (cropCatalog.status === "error") return <Message message={cropCatalog.message} onRetry={() => window.location.reload()} />;
  if (placementsState.status === "error") return <Message message={placementsState.message} onRetry={() => void placementsState.reload()} />;
  if (
    seasonsState.status === "loading"
    || spacesState.status === "loading"
    || cropCatalog.status === "loading"
    || placementsState.status === "loading"
  ) {
    return <p className="surface-panel p-5 text-muted" role="status">화분 배치를 준비하고 있습니다.</p>;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="배치를 만들 시즌을 찾을 수 없습니다." />;

  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <Message message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;

  if (space.type === "garden") {
    return (
      <div className="surface-panel p-6 text-center">
        <p className="text-sm leading-6 text-muted">마당·텃밭은 격자에서 작물을 배치합니다.</p>
        <Link className="mt-4 inline-flex font-bold text-leaf underline" href={`/seasons/${season.id}/layout`}>
          격자 배치로 이동 →
        </Link>
      </div>
    );
  }

  const containerSpaces = spacesState.spaces.filter((item) => item.type !== "garden");

  return (
    <PlacementForm
      containerSpaces={containerSpaces}
      crops={cropCatalog.crops}
      placements={placementsState.placements}
      reload={placementsState.reload}
      season={season}
    />
  );
}

function PlacementForm({
  containerSpaces,
  crops,
  placements,
  reload,
  season,
}: {
  containerSpaces: readonly GrowingSpace[];
  crops: readonly CropReference[];
  placements: ContainerPlacements;
  reload: () => Promise<void>;
  season: PersistedGrowingSeason;
}) {
  const [rows, setRows] = useState<ContainerPlacementRow[]>(() =>
    toEditableRows(placements.placements).map((row) => ({ ...row, key: nextRowKey() })),
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isRunningRef = useRef(false);

  function addRow() {
    const defaultSpace = containerSpaces.find((item) => item.id === season.spaceId) ?? containerSpaces[0];
    setRows((current) => [
      ...current,
      { key: nextRowKey(), spaceId: defaultSpace?.id ?? "", cropId: "", quantity: 1 },
    ]);
  }

  function updateRow(key: string, patch: Partial<Omit<ContainerPlacementRow, "key">>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  async function save() {
    if (isRunningRef.current) return;
    setError("");
    const message = validatePlacementRows(rows);
    if (message) {
      setError(message);
      return;
    }

    isRunningRef.current = true;
    setIsSaving(true);
    try {
      await putContainerPlacements(season.id, placements.version, toPlacementInputs(rows));
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "화분 배치를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
      isRunningRef.current = false;
    }
  }

  return (
    <div className="min-w-0 max-w-full">
      <section className="surface-panel p-6">
        <h2 className="text-xl font-bold">{season.name} · 화분 배치</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          화분마다 키울 작물과 수량을 추가해 주세요. 한 시즌 안에서 여러 화분에 나눠 배치할 수 있어요.
        </p>

        {containerSpaces.length === 0 ? (
          <p className="mt-4 text-sm text-muted">배치할 수 있는 화분·베란다 공간이 없습니다.</p>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {rows.map((row) => (
              <PlacementRowFields
                containerSpaces={containerSpaces}
                crops={crops}
                key={row.key}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
                row={row}
              />
            ))}
          </div>
        )}

        <button
          className="mt-4 rounded-full border border-leaf px-5 py-2.5 text-sm font-bold text-leaf disabled:opacity-60"
          disabled={containerSpaces.length === 0}
          onClick={addRow}
          type="button"
        >
          + 작물 추가
        </button>

        {error && (
          <p className="mt-4 rounded-xl bg-[#fff4f2] p-4 text-sm font-bold text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}

        <button
          className="mt-6 w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void save()}
          type="button"
        >
          {isSaving ? "저장 중" : "배치 저장"}
        </button>
      </section>

      <PlacementNextStep placementCount={placements.placements.length} season={season} />
    </div>
  );
}

function PlacementRowFields({
  containerSpaces,
  crops,
  onChange,
  onRemove,
  row,
}: {
  containerSpaces: readonly GrowingSpace[];
  crops: readonly CropReference[];
  onChange: (patch: Partial<Omit<ContainerPlacementRow, "key">>) => void;
  onRemove: () => void;
  row: ContainerPlacementRow;
}) {
  const selectedSpace = containerSpaces.find((space) => space.id === row.spaceId);
  const compatibleCrops = selectedSpace
    ? crops.filter((crop) => crop.supportedSpaces.includes(selectedSpace.type))
    : crops;

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-black/10 p-4 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-end">
      <label className="block text-sm">
        <span className="mb-1 block font-bold">화분</span>
        <select
          className="form-input"
          onChange={(event) => onChange({ spaceId: event.target.value, cropId: "" })}
          value={row.spaceId}
        >
          <option value="">화분 선택</option>
          {containerSpaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name} · {GROWING_SPACE_LABELS[space.type]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-bold">작물</span>
        <select
          className="form-input"
          disabled={!row.spaceId}
          onChange={(event) => onChange({ cropId: event.target.value })}
          value={row.cropId}
        >
          <option value="">{row.spaceId ? "작물 선택" : "화분을 먼저 선택해 주세요"}</option>
          {compatibleCrops.map((crop) => (
            <option key={crop.id} value={crop.id}>{crop.name}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-bold">수량</span>
        <input
          className="form-input"
          max={500}
          min={1}
          onChange={(event) => onChange({ quantity: Number(event.target.value) })}
          type="number"
          value={row.quantity}
        />
      </label>
      <button
        className="rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold"
        onClick={onRemove}
        type="button"
      >
        삭제
      </button>
    </div>
  );
}

function PlacementNextStep({
  placementCount,
  season,
}: {
  placementCount: number;
  season: PersistedGrowingSeason;
}) {
  if (placementCount === 0) {
    return (
      <section className="surface-panel mt-6 border-dashed p-6" aria-labelledby="placement-next-step-title">
        <p className="text-sm font-bold text-leaf">다음 단계</p>
        <h2 className="mt-1 text-xl font-bold" id="placement-next-step-title">작물을 먼저 추가해 주세요</h2>
        <p className="mt-2 text-sm leading-6 text-muted">한 가지 이상 추가하고 저장하면 재배 일정을 만들 수 있습니다.</p>
      </section>
    );
  }

  return (
    <section
      className="mt-6 rounded-3xl bg-[#0f513f] p-6 text-white shadow-[var(--shadow-md)] sm:flex sm:items-center sm:justify-between sm:gap-6"
      aria-labelledby="placement-next-step-title"
    >
      <div>
        <p className="text-sm font-bold text-[#ffd26f]">배치 완료 · 다음 단계</p>
        <h2 className="mt-2 text-2xl font-bold" id="placement-next-step-title">작물별 재배 일정을 만들어 보세요</h2>
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
