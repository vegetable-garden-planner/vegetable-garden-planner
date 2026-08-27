"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import {
  autoPlaceRows,
  isPlacedRow,
  MAX_QUANTITY,
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

/**
 * 화분 배치 캔버스
 *
 * 왼쪽 "선택한 채소"는 아직 화분에 안 넣은(spaceId === "") 채소 풀이고,
 * 오른쪽은 화분마다 이미 배치된 채소를 보여준다. 같은 rows 배열 안에서
 * spaceId 유무로만 두 영역을 나눈다 — 별도 자료구조를 두지 않는다.
 *
 * 데스크톱은 칩을 직접 드래그해서 화분에 놓을 수 있고(포인터 이벤트 직접
 * 구현, 라이브러리 없음), 모바일을 포함해 어디서든 칩을 탭해 선택한 뒤
 * 화분(또는 되돌리려면 풀)을 탭해도 같은 결과가 된다.
 */
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
  const router = useRouter();
  const [rows, setRows] = useState<ContainerPlacementRow[]>(() =>
    toEditableRows(placements.placements).map((row) => ({ ...row, key: nextRowKey() })),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isRunningRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const poolRows = rows.filter((row) => !isPlacedRow(row));

  function cropOf(cropId: string) {
    return crops.find((crop) => crop.id === cropId);
  }

  function addToPool(cropId: string, quantity: number) {
    setRows((current) => [...current, { key: nextRowKey(), spaceId: "", cropId, quantity }]);
  }

  function assign(rowKey: string, spaceId: string) {
    const row = rows.find((item) => item.key === rowKey);
    const space = containerSpaces.find((item) => item.id === spaceId);
    const crop = row ? cropOf(row.cropId) : undefined;
    if (space && crop && !crop.supportedSpaces.includes(space.type)) {
      setError(`${crop.name}은(는) ${GROWING_SPACE_LABELS[space.type]}에는 배치할 수 없어요.`);
      return;
    }
    setError("");
    setRows((current) => current.map((item) => (item.key === rowKey ? { ...item, spaceId } : item)));
    setSelectedKey(null);
  }

  function updateQuantity(rowKey: string, quantity: number) {
    setRows((current) => current.map((item) => (item.key === rowKey ? { ...item, quantity } : item)));
  }

  function removeRow(rowKey: string) {
    setRows((current) => current.filter((item) => item.key !== rowKey));
    setSelectedKey((current) => (current === rowKey ? null : current));
  }

  function toggleSelect(rowKey: string) {
    setSelectedKey((current) => (current === rowKey ? null : rowKey));
  }

  function autoPlace() {
    setError("");
    setRows((current) => autoPlaceRows(current, crops, containerSpaces));
  }

  function resetToSaved() {
    setRows(toEditableRows(placements.placements).map((row) => ({ ...row, key: nextRowKey() })));
    setSelectedKey(null);
    setError("");
  }

  async function save() {
    if (isRunningRef.current) return;
    setError("");
    const placedRows = rows.filter(isPlacedRow);
    const message = validatePlacementRows(placedRows);
    if (message) {
      setError(message);
      return;
    }

    isRunningRef.current = true;
    setIsSaving(true);
    try {
      await putContainerPlacements(season.id, placements.version, toPlacementInputs(placedRows));
      if (placedRows.length > 0) {
        router.push(`/seasons/${season.id}/placements/summary`);
        return;
      }
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "화분 배치를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
      isRunningRef.current = false;
    }
  }

  // 데스크톱 전용 드래그. 모바일은 탭-선택 → 탭-배치로 충분해 포인터 드래그를 켜지 않는다.
  const drag = useContainerDrag(canvasRef, assign);

  return (
    <div className="min-w-0 max-w-full">
      <section className="surface-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{season.name} · 화분 배치</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              작물을 화분으로 끌어서 놓거나, 작물을 탭한 뒤 놓을 화분을 탭해 주세요.
            </p>
          </div>
          {containerSpaces.length > 0 && (
            <PlacementToolbar
              canAutoPlace={poolRows.length > 0}
              onAutoPlace={autoPlace}
              onReset={resetToSaved}
            />
          )}
        </div>

        {containerSpaces.length === 0 ? (
          <p className="mt-4 text-sm text-muted">배치할 수 있는 화분·베란다 공간이 없습니다.</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" ref={canvasRef}>
            <CropPool
              crops={crops}
              draggingKey={drag.draggingKey}
              onAdd={addToPool}
              onQuantityChange={updateQuantity}
              onRemove={removeRow}
              onSelect={toggleSelect}
              rows={poolRows}
              selectedKey={selectedKey}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {containerSpaces.map((space) => (
                <ContainerCard
                  crops={crops}
                  draggingKey={drag.draggingKey}
                  isDropHover={drag.dropHoverSpaceId === space.id}
                  key={space.id}
                  onDropZoneClick={() => selectedKey && assign(selectedKey, space.id)}
                  onQuantityChange={updateQuantity}
                  onRemoveRow={removeRow}
                  onSelectChip={toggleSelect}
                  rows={rows.filter((row) => row.spaceId === space.id)}
                  selectedKey={selectedKey}
                  space={space}
                />
              ))}
            </div>
          </div>
        )}

        <PlacementFooter
          error={error}
          isSaving={isSaving}
          onSave={() => void save()}
          unplacedCount={poolRows.length}
        />
      </section>

      <DragGhost label={chipLabel(rows.find((row) => row.key === drag.draggingKey), crops)} point={drag.dragPoint} />

      <PlacementNextStep placementCount={placements.placements.filter(isPlacedRow).length} season={season} />
    </div>
  );
}

/**
 * 화분 배치 캔버스의 데스크톱 드래그 처리.
 *
 * pointer:fine 환경에서만 켠다(모바일은 탭-선택/탭-배치로 충분). 캔버스
 * ref는 호출자가 만들어 넘긴다 — 이 훅은 반응형 상태만 돌려준다. 최신
 * onDrop 콜백은 effect에서 ref에 옮겨 두어 rows가 바뀔 때마다 리스너를
 * 다시 붙이지 않는다 — 리스너 자체는 마운트 시 한 번만 등록한다.
 */
function useContainerDrag(
  canvasRef: RefObject<HTMLDivElement | null>,
  onDrop: (rowKey: string, spaceId: string) => void,
) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [dropHoverSpaceId, setDropHoverSpaceId] = useState<string | null>(null);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.matchMedia("(pointer: fine)").matches) return;

    let down: { key: string; x: number; y: number } | null = null;
    let dragging = false;

    function findDropSpace(x: number, y: number) {
      const element = document.elementFromPoint(x, y);
      return element?.closest<HTMLElement>("[data-drop-space]") ?? null;
    }

    function onPointerDown(event: PointerEvent) {
      const chip = (event.target as Element).closest<HTMLElement>("[data-chip-key]");
      if (!chip) return;
      down = { key: chip.dataset.chipKey ?? "", x: event.clientX, y: event.clientY };
      dragging = false;
    }

    function onPointerMove(event: PointerEvent) {
      if (!down) return;
      if (!dragging && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) {
        dragging = true;
        setDraggingKey(down.key);
        document.body.style.userSelect = "none";
      }
      if (dragging) {
        setDragPoint({ x: event.clientX, y: event.clientY });
        setDropHoverSpaceId(findDropSpace(event.clientX, event.clientY)?.dataset.dropSpace ?? null);
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (down && dragging) {
        const zone = findDropSpace(event.clientX, event.clientY);
        if (zone) onDropRef.current(down.key, zone.dataset.dropSpace ?? "");
      }
      down = null;
      dragging = false;
      document.body.style.removeProperty("user-select");
      setDraggingKey(null);
      setDragPoint(null);
      setDropHoverSpaceId(null);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.removeProperty("user-select");
    };
  }, [canvasRef]);

  return { draggingKey, dragPoint, dropHoverSpaceId };
}

function chipLabel(row: ContainerPlacementRow | undefined, crops: readonly CropReference[]): string {
  if (!row) return "";
  const crop = crops.find((item) => item.id === row.cropId);
  return `${crop?.name ?? "작물"} ${row.quantity}포기`;
}

function DragGhost({ label, point }: { label: string; point: { x: number; y: number } | null }) {
  if (!point) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-white shadow-lg"
      style={{ left: point.x, top: point.y }}
    >
      {label}
    </div>
  );
}

function PlacementToolbar({
  canAutoPlace,
  onAutoPlace,
  onReset,
}: {
  canAutoPlace: boolean;
  onAutoPlace: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        className="rounded-full border border-leaf px-4 py-2 text-sm font-bold text-leaf disabled:opacity-60"
        disabled={!canAutoPlace}
        onClick={onAutoPlace}
        type="button"
      >
        자동 배치
      </button>
      <button
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-bold"
        onClick={onReset}
        type="button"
      >
        되돌리기
      </button>
    </div>
  );
}

function CropPool({
  crops,
  draggingKey,
  onAdd,
  onQuantityChange,
  onRemove,
  onSelect,
  rows,
  selectedKey,
}: {
  crops: readonly CropReference[];
  draggingKey: string | null;
  onAdd: (cropId: string, quantity: number) => void;
  onQuantityChange: (rowKey: string, quantity: number) => void;
  onRemove: (rowKey: string) => void;
  onSelect: (rowKey: string) => void;
  rows: readonly ContainerPlacementRow[];
  selectedKey: string | null;
}) {
  return (
    <div className="rounded-2xl border border-black/10 p-4" data-drop-space="">
      <h3 className="font-bold">선택한 채소</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">아직 화분에 넣지 않은 작물이 없어요.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <CropChip
              crop={crops.find((crop) => crop.id === row.cropId)}
              dragging={draggingKey === row.key}
              key={row.key}
              onQuantityChange={(quantity) => onQuantityChange(row.key, quantity)}
              onRemove={() => onRemove(row.key)}
              onSelect={() => onSelect(row.key)}
              row={row}
              selected={selectedKey === row.key}
            />
          ))}
        </div>
      )}
      <AddCropControl crops={crops} onAdd={onAdd} />
    </div>
  );
}

function PlacementFooter({
  error,
  isSaving,
  onSave,
  unplacedCount,
}: {
  error: string;
  isSaving: boolean;
  onSave: () => void;
  unplacedCount: number;
}) {
  return (
    <>
      {unplacedCount > 0 && (
        <p className="mt-4 rounded-xl bg-[#fff8ec] p-4 text-sm text-muted" role="status">
          아직 화분에 넣지 않은 작물이 {unplacedCount}종 있어요. 지금 저장하면 이 작물은 배치에서 빠집니다.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-[#fff4f2] p-4 text-sm font-bold text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      <button
        className="mt-6 w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white disabled:opacity-60"
        disabled={isSaving}
        onClick={onSave}
        type="button"
      >
        {isSaving ? "저장 중" : "이 배치로 계속하기 →"}
      </button>
    </>
  );
}

function ContainerCard({
  crops,
  draggingKey,
  isDropHover,
  onDropZoneClick,
  onQuantityChange,
  onRemoveRow,
  onSelectChip,
  rows,
  selectedKey,
  space,
}: {
  crops: readonly CropReference[];
  draggingKey: string | null;
  isDropHover: boolean;
  onDropZoneClick: () => void;
  onQuantityChange: (rowKey: string, quantity: number) => void;
  onRemoveRow: (rowKey: string) => void;
  onSelectChip: (rowKey: string) => void;
  rows: readonly ContainerPlacementRow[];
  selectedKey: string | null;
  space: GrowingSpace;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isDropHover ? "border-leaf bg-[#eef8f3]" : "border-black/10 bg-white"
      }`}
      data-drop-space={space.id}
    >
      <p className="font-bold">{space.name}</p>
      <p className="text-xs text-muted">
        {GROWING_SPACE_LABELS[space.type]} · {space.widthCm}×{space.lengthCm}cm
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <CropChip
            crop={crops.find((crop) => crop.id === row.cropId)}
            dragging={draggingKey === row.key}
            key={row.key}
            onQuantityChange={(quantity) => onQuantityChange(row.key, quantity)}
            onRemove={() => onRemoveRow(row.key)}
            onSelect={() => onSelectChip(row.key)}
            row={row}
            selected={selectedKey === row.key}
          />
        ))}
      </div>

      <button
        className="mt-3 w-full rounded-2xl border border-dashed border-black/20 p-3 text-center text-sm text-muted hover:border-leaf hover:text-leaf"
        onClick={onDropZoneClick}
        type="button"
      >
        {rows.length === 0 ? "여기에 놓기" : "+ 여기에 추가"}
      </button>
    </div>
  );
}

function CropChip({
  crop,
  dragging,
  onQuantityChange,
  onRemove,
  onSelect,
  row,
  selected,
}: {
  crop: CropReference | undefined;
  dragging: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSelect: () => void;
  row: ContainerPlacementRow;
  selected: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border p-3 ${
        selected ? "border-leaf bg-[#eef8f3]" : "border-black/10 bg-white"
      } ${dragging ? "opacity-40" : ""}`}
      data-chip-key={row.key}
    >
      <button
        aria-pressed={selected}
        className="flex-1 text-left font-bold"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        type="button"
      >
        {crop?.name ?? "알 수 없는 작물"}
      </button>
      <input
        aria-label={`${crop?.name ?? "작물"} 수량`}
        className="form-input w-16 px-2 py-1.5 text-center text-sm"
        max={MAX_QUANTITY}
        min={1}
        onChange={(event) => onQuantityChange(Number(event.target.value))}
        onClick={(event) => event.stopPropagation()}
        type="number"
        value={row.quantity}
      />
      <span className="text-sm text-muted">포기</span>
      <button
        aria-label={`${crop?.name ?? "작물"} 삭제`}
        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        type="button"
      >
        삭제
      </button>
    </div>
  );
}

function AddCropControl({
  crops,
  onAdd,
}: {
  crops: readonly CropReference[];
  onAdd: (cropId: string, quantity: number) => void;
}) {
  const [cropId, setCropId] = useState("");
  const [quantity, setQuantity] = useState(1);

  function submit() {
    if (!cropId) return;
    onAdd(cropId, quantity);
    setCropId("");
    setQuantity(1);
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-dashed border-black/15 p-3">
      <select
        className="form-input"
        onChange={(event) => setCropId(event.target.value)}
        value={cropId}
      >
        <option value="">작물 선택</option>
        {crops.map((crop) => (
          <option key={crop.id} value={crop.id}>{crop.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <input
          aria-label="수량"
          className="form-input flex-1"
          max={MAX_QUANTITY}
          min={1}
          onChange={(event) => setQuantity(Number(event.target.value))}
          type="number"
          value={quantity}
        />
        <button
          className="shrink-0 rounded-full border border-leaf px-4 py-2 text-sm font-bold text-leaf disabled:opacity-60"
          disabled={!cropId}
          onClick={submit}
          type="button"
        >
          + 추가
        </button>
      </div>
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
