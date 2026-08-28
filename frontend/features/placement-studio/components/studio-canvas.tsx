"use client";

import {
  useRef,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import type { SpaceMemo } from "@/features/space-memo/domain/space-memo";
import {
  GRID_INSET,
  growthWidthCm,
  planterSize,
  type StudioPlanter,
  type StudioState,
} from "@/features/placement-studio/domain/studio-model";
import { RESIZE_DIRS, rectFromDrag, resizeRect, type Rect, type ResizeDir } from "@/features/placement-studio/domain/planter-group";
import type { OverallStatus } from "@/features/placement-studio/domain/validation";
import type { ViewTransform } from "@/features/placement-studio/hooks/use-canvas-view";
import { CropImage } from "./crop-image";
import type { RecommendationState, Selection, StudioTool } from "./studio-types";
import { dragOnWindow } from "./drag-controller";
import styles from "./placement-studio.module.css";

const SNAP = 10;

export interface CanvasHandlers {
  /** 추천 표시는 지우지 않는다. 추천 칸을 누르려면 먼저 화분에 pointerdown 이 들어오기 때문이다. */
  onSelectPlanter: (id: string) => void;
  onSelectCrop: (id: string, append: boolean) => void;
  onSelectGroup: (id: string) => void;
  onSelectMemo: (id: string) => void;
  onDeselect: () => void;
  onCellActivate: (planterId: string, col: number, row: number) => void;
  onDropCropId: (cropId: string, planterId: string, col: number, row: number) => void;
  onMoveCrop: (placementId: string, planterId: string, col: number, row: number) => void;
  onMovePlanter: (id: string, x: number, y: number) => void;
  onCreateGroup: (rect: Rect) => void;
  onMoveGroup: (id: string, dx: number, dy: number) => void;
  onResizeGroup: (id: string, dir: ResizeDir, dx: number, dy: number, base: Rect) => void;
  onPan: (dx: number, dy: number) => void;
  onNotice: (message: string) => void;
}

/** 계획별 구분색. 캔버스에서 어느 계획의 화분인지 한눈에 보이게 한다. */
export const PLAN_TINTS = ["#0C9769", "#C2711A", "#3B6FB5", "#8A4FB8", "#B23A62", "#2E8B8B"] as const;

export function planTint(plans: readonly { id: string }[], seasonId: string): string {
  const index = plans.findIndex((plan) => plan.id === seasonId);
  return PLAN_TINTS[(index < 0 ? 0 : index) % PLAN_TINTS.length];
}

export interface CanvasProps extends CanvasHandlers {
  /** 화분 제목 아래 계획 이름을 붙일 때 쓰는 계획 목록 (색 순서) */
  plans: readonly { id: string; name: string }[];
  viewportRef: RefObject<HTMLDivElement | null>;
  state: StudioState;
  cropsById: ReadonlyMap<string, CropReference>;
  view: ViewTransform;
  selection: Selection;
  tool: StudioTool;
  handMode: boolean;
  memos: readonly SpaceMemo[];
  recommendation: RecommendationState | null;
  statusByPlacementId: ReadonlyMap<string, OverallStatus>;
  mobileMoveId: string | null;
}

export function StudioCanvas(props: CanvasProps) {
  const { viewportRef, state, view, tool, handMode } = props;
  const draftRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<{ start: { x: number; y: number }; rect: Rect; moved: boolean } | null>(null);

  function pointOf(event: { clientX: number; clientY: number }) {
    const box = viewportRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: (event.clientX - box.left - view.x) / view.zoom, y: (event.clientY - box.top - view.y) / view.zoom };
  }

  function onViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const onFurniture = target.closest(`.${styles.planter}, .${styles.groupLabel}, .${styles.attachedNote}, .${styles.issuePin}, .${styles.groupResizeHandle}`);

    if (handMode || event.button === 1 || event.button === 2) {
      startPan(event, props.onPan);
      return;
    }
    if (tool === "group" && !onFurniture) {
      startDraw(event);
      return;
    }
    if (!onFurniture) props.onDeselect();
  }

  function startDraw(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointOf(event);
    drawRef.current = { start, rect: { ...start, w: 0, h: 0 }, moved: false };
    event.preventDefault();

    dragOnWindow({
      onMove: (move) => {
        const draw = drawRef.current;
        if (!draw) return;
        const rect = rectFromDrag(draw.start, pointOf(move));
        draw.rect = rect;
        if (rect.w > 8 || rect.h > 8) draw.moved = true;
        const node = draftRef.current;
        if (!node) return;
        node.style.display = "block";
        node.style.left = `${rect.x}px`;
        node.style.top = `${rect.y}px`;
        node.style.width = `${rect.w}px`;
        node.style.height = `${rect.h}px`;
      },
      onEnd: () => {
        const draw = drawRef.current;
        drawRef.current = null;
        if (draftRef.current) draftRef.current.style.display = "none";
        if (draw?.moved) props.onCreateGroup(draw.rect);
      },
    });
  }

  return (
    <div
      className={`${styles.viewport} ${handMode ? styles.panCursor : ""}`}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={onViewportPointerDown}
      ref={viewportRef}
    >
      <div
        className={styles.stage}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
      >
        {state.groups.map((group) => (
          <GroupBox
            group={group}
            key={group.id}
            onMove={props.onMoveGroup}
            onResize={props.onResizeGroup}
            onSelect={props.onSelectGroup}
            selected={props.selection.type === "group" && props.selection.ids.includes(group.id)}
            zoom={view.zoom}
          />
        ))}

        {state.planters.map((planter) => (
          <PlanterBox key={planter.id} planter={planter} {...props} />
        ))}

        {memoNotes(props.memos, state.planters).map((note) => (
          <MemoNote
            index={note.index}
            key={`${note.memo.id}@${note.planter.id}`}
            memo={note.memo}
            onSelect={props.onSelectMemo}
            planter={note.planter}
          />
        ))}

        <div className={styles.groupDraft} ref={draftRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}

/**
 * 메모는 공간(spaceId)에 붙는다.
 * 같은 공간을 여러 계획이 쓰면 그 공간의 화분마다 같은 메모가 붙는다.
 */
function memoNotes(memos: readonly SpaceMemo[], planters: readonly StudioPlanter[]) {
  const notes: { memo: SpaceMemo; planter: StudioPlanter; index: number }[] = [];
  const stacked = new Map<string, number>();

  for (const memo of memos) {
    for (const planter of planters) {
      if (planter.spaceId !== memo.spaceId) continue;
      const index = stacked.get(planter.id) ?? 0;
      stacked.set(planter.id, index + 1);
      notes.push({ memo, planter, index });
    }
  }

  return notes;
}

function startPan(event: ReactPointerEvent<HTMLDivElement>, onPan: (dx: number, dy: number) => void) {
  let lastX = event.clientX;
  let lastY = event.clientY;
  const node = event.currentTarget;
  node.classList.add(styles.panning);
  event.preventDefault();

  dragOnWindow({
    onMove: (move) => {
      onPan(move.clientX - lastX, move.clientY - lastY);
      lastX = move.clientX;
      lastY = move.clientY;
    },
    onEnd: () => node.classList.remove(styles.panning),
  });
}

/* ------------------------------------------------------------------ 그룹 */

function GroupBox({
  group,
  selected,
  zoom,
  onSelect,
  onMove,
  onResize,
}: {
  group: StudioState["groups"][number];
  selected: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, dir: ResizeDir, dx: number, dy: number, base: Rect) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  function beginMove(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();
    onSelect(group.id);
    const startX = event.clientX;
    const startY = event.clientY;
    let dx = 0;
    let dy = 0;
    const box = boxRef.current;
    const members = group.planterIds
      .map((id) => document.querySelector<HTMLElement>(`[data-planter="${id}"]`))
      .filter((node): node is HTMLElement => node !== null);

    dragOnWindow({
      onMove: (move) => {
        dx = (move.clientX - startX) / zoom;
        dy = (move.clientY - startY) / zoom;
        const shift = `translate3d(${dx}px, ${dy}px, 0)`;
        if (box) box.style.transform = shift;
        for (const node of members) node.style.transform = shift;
      },
      onEnd: () => {
        if (box) box.style.transform = "";
        for (const node of members) node.style.transform = "";
        if (Math.abs(dx) + Math.abs(dy) > 1) onMove(group.id, dx, dy);
      },
    });
  }

  /**
   * 8방향 손잡이.
   * 끄는 동안에는 화면만 바꾸고, 손을 뗄 때 한 번만 상태에 반영한다.
   * 기준은 언제나 끌기를 시작한 순간의 크기라서 값이 누적되지 않는다.
   */
  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, dir: ResizeDir) {
    event.stopPropagation();
    event.preventDefault();
    onSelect(group.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const base: Rect = { x: group.x, y: group.y, w: group.w, h: group.h };
    const box = boxRef.current;
    let dx = 0;
    let dy = 0;
    let moved = false;

    dragOnWindow({
      onMove: (move) => {
        dx = (move.clientX - startX) / zoom;
        dy = (move.clientY - startY) / zoom;
        if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        const next = resizeRect(base, dir, dx, dy);
        if (!box) return;
        box.style.left = `${next.x}px`;
        box.style.top = `${next.y}px`;
        box.style.width = `${next.w}px`;
        box.style.height = `${next.h}px`;
        const readout = box.querySelector(`.${styles.groupSizeReadout}`);
        if (readout) readout.textContent = `${Math.round(next.w)} × ${Math.round(next.h)}`;
      },
      onEnd: () => {
        if (box) {
          box.style.left = "";
          box.style.top = "";
          box.style.width = "";
          box.style.height = "";
        }
        if (moved) onResize(group.id, dir, dx, dy, base);
      },
    });
  }

  return (
    <div
      className={`${styles.groupBox} ${selected ? styles.groupBoxSelected : ""}`}
      data-groupbox={group.id}
      ref={boxRef}
      style={{ left: group.x, top: group.y, width: group.w, height: group.h }}
    >
      <div className={styles.groupLabel} onPointerDown={beginMove} role="presentation">
        {group.name}
        <span className={styles.groupCount}>{group.planterIds.length}개</span>
      </div>

      {selected && RESIZE_DIRS.map((dir) => (
        <button
          aria-label={`그룹 크기 조절 ${dir}`}
          className={`${styles.groupResizeHandle} ${HANDLE_CLASS[dir]}`}
          key={dir}
          onPointerDown={(event) => beginResize(event, dir)}
          type="button"
        />
      ))}

      {selected && (
        <div className={styles.groupSizeReadout}>{Math.round(group.w)} × {Math.round(group.h)}</div>
      )}
    </div>
  );
}

const HANDLE_CLASS: Record<ResizeDir, string> = {
  nw: styles.handleNw,
  n: styles.handleN,
  ne: styles.handleNe,
  e: styles.handleE,
  se: styles.handleSe,
  s: styles.handleS,
  sw: styles.handleSw,
  w: styles.handleW,
};

/* ---------------------------------------------------------------- 화분 */

function PlanterBox(props: CanvasProps & { planter: StudioPlanter }) {
  const { planter, state, view, selection } = props;
  const size = planterSize(planter);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = selection.type === "planter" && selection.ids.includes(planter.id);
  const tint = planTint(props.plans, planter.seasonId);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(`.${styles.cropNode}`)) return;
    if (props.handMode || props.tool === "group") return;
    event.stopPropagation();

    props.onSelectPlanter(planter.id);
    const startX = event.clientX;
    const startY = event.clientY;
    let dx = 0;
    let dy = 0;
    let moved = false;
    const node = boxRef.current;

    dragOnWindow({
      onMove: (move) => {
        dx = (move.clientX - startX) / view.zoom;
        dy = (move.clientY - startY) / view.zoom;
        // 기본은 완전 자유 이동. Shift 를 누르고 있는 동안만 10px 스냅.
        if (move.shiftKey) {
          dx = Math.round(dx / SNAP) * SNAP;
          dy = Math.round(dy / SNAP) * SNAP;
        }
        if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        if (node) {
          node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          node.classList.add(styles.planterDragging);
        }
        markDropTarget(state, planter, dx, dy);
      },
      onEnd: () => {
        if (node) {
          node.style.transform = "";
          node.classList.remove(styles.planterDragging);
        }
        clearDropTargets();
        if (moved) props.onMovePlanter(planter.id, planter.x + dx, planter.y + dy);
      },
    });
  }

  const cells = [];
  for (let row = 0; row < planter.rows; row += 1) {
    for (let col = 0; col < planter.cols; col += 1) {
      cells.push(
        <PlanterCell {...props} col={col} key={`${col}-${row}`} row={row} />,
      );
    }
  }

  return (
    <div
      className={`${styles.planter} ${selected ? styles.planterSelected : ""}`}
      data-planter={planter.id}
      onPointerDown={beginDrag}
      ref={boxRef}
      style={{
        left: planter.x,
        top: planter.y,
        width: size.w,
        height: size.h,
        borderColor: tint,
      }}
    >
      <div className={styles.planterTitle}>
        {planter.name}
        <small>{planter.w}×{planter.h}{planter.d === null ? "" : `×${planter.d}`}cm</small>
        <span className={styles.planBadge} style={{ borderColor: tint, color: tint }}>
          {planter.seasonName}
        </span>
      </div>

      <div
        className={styles.plantGrid}
        style={{
          gridTemplateColumns: `repeat(${planter.cols}, 1fr)`,
          gridTemplateRows: `repeat(${planter.rows}, 1fr)`,
        }}
      >
        {cells}
      </div>

      <GrowthRing {...props} size={size} />
    </div>
  );
}

function markDropTarget(state: StudioState, planter: StudioPlanter, dx: number, dy: number) {
  clearDropTargets();
  const size = planterSize(planter);
  const cx = planter.x + dx + size.w / 2;
  const cy = planter.y + dy + size.h / 2;
  const hit = [...state.groups].reverse().find((group) => (
    cx >= group.x && cx <= group.x + group.w && cy >= group.y && cy <= group.y + group.h
  ));
  if (!hit) return;
  document.querySelector(`[data-groupbox="${hit.id}"]`)?.classList.add(styles.groupDropTarget);
}

function clearDropTargets() {
  for (const node of document.querySelectorAll(`.${styles.groupDropTarget}`)) {
    node.classList.remove(styles.groupDropTarget);
  }
}

/** 선택한 작물 한 포기의 성장 예상 범위 */
function GrowthRing(props: CanvasProps & { planter: StudioPlanter; size: { w: number; h: number } }) {
  const { planter, size, selection, state, cropsById } = props;
  if (selection.type !== "crop" || selection.ids.length !== 1) return null;

  const placement = state.placements.find((item) => item.id === selection.ids[0]);
  if (!placement || placement.planterId !== planter.id) return null;
  const crop = cropsById.get(placement.cropId);
  if (!crop) return null;

  const gridW = size.w - GRID_INSET * 2;
  const gridH = size.h - GRID_INSET * 2;
  const cx = GRID_INSET + (placement.col + 0.5) * (gridW / planter.cols);
  const cy = GRID_INSET + (placement.row + 0.5) * (gridH / planter.rows);
  const width = Math.max(34, growthWidthCm(crop) * gridW / planter.w);
  const height = Math.max(34, growthWidthCm(crop) * gridH / planter.h);

  return <div className={styles.growthRing} style={{ left: cx, top: cy, width, height }} />;
}

/* ------------------------------------------------------------------ 칸 */

function PlanterCell(props: CanvasProps & { planter: StudioPlanter; col: number; row: number }) {
  const { planter, col, row, state, cropsById, selection, recommendation } = props;
  const placement = state.placements.find((item) => (
    item.planterId === planter.id && item.col === col && item.row === row
  ));
  const crop = placement ? cropsById.get(placement.cropId) : undefined;
  const rec = recommendation?.cells.find((cell) => (
    cell.planterId === planter.id && cell.col === col && cell.row === row
  ));

  const status = placement ? props.statusByPlacementId.get(placement.id) : undefined;
  const classes = [styles.cell];
  if (rec) classes.push(rec.rank === 1 ? styles.recBest : rec.status === "good" ? styles.recGood : styles.recWarn);
  if (props.mobileMoveId && !placement) classes.push(styles.cellMoveTarget);
  if (status === "bad") classes.push(styles.cellIssue);
  if (status === "warning") classes.push(styles.cellCaution);

  function onDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove(styles.cellHover);
    const cropId = event.dataTransfer.getData("text/crop-id");
    if (cropId) props.onDropCropId(cropId, planter.id, col, row);
  }

  return (
    <div
      className={classes.join(" ")}
      onClick={() => props.onCellActivate(planter.id, col, row)}
      onDragLeave={(event) => event.currentTarget.classList.remove(styles.cellHover)}
      onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add(styles.cellHover); }}
      onDrop={onDrop}
      onKeyDown={(event) => { if (event.key === "Enter") props.onCellActivate(planter.id, col, row); }}
      role="gridcell"
      tabIndex={-1}
    >
      {placement && crop && (
        <CropNode
          crop={crop}
          onMove={props.onMoveCrop}
          onNotice={props.onNotice}
          onSelect={props.onSelectCrop}
          placementId={placement.id}
          selected={selection.type === "crop" && selection.ids.includes(placement.id)}
        />
      )}
      {rec && rec.rank <= 3 && <span className={styles.recRank}>{rec.rank}</span>}
    </div>
  );
}

/** 칸 안의 작물 한 포기. 마우스·터치 모두 포인터 이벤트로 끌어 옮긴다. */
function CropNode({
  crop,
  placementId,
  selected,
  onSelect,
  onMove,
  onNotice,
}: {
  crop: CropReference;
  placementId: string;
  selected: boolean;
  onSelect: (id: string, append: boolean) => void;
  onMove: (placementId: string, planterId: string, col: number, row: number) => void;
  onNotice: (message: string) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);

  function begin(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const node = nodeRef.current;
    let moved = false;
    const append = event.shiftKey;

    dragOnWindow({
      onMove: (move) => {
        const dx = move.clientX - startX;
        const dy = move.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        moved = true;
        if (!node) return;
        node.classList.add(styles.touchDragging);
        node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      },
      onEnd: (end) => {
        if (node) {
          node.classList.remove(styles.touchDragging);
          node.style.transform = "";
        }
        if (!moved) {
          onSelect(placementId, append);
          return;
        }
        const cell = cellUnder(node, end.clientX, end.clientY);
        if (!cell) {
          onNotice("화분의 칸 위에 놓아주세요.");
          return;
        }
        onMove(placementId, cell.planterId, cell.col, cell.row);
      },
    });
  }

  return (
    <div
      className={`${styles.cropNode} ${selected ? styles.cropNodeSelected : ""}`}
      data-placement={placementId}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={begin}
      ref={nodeRef}
      role="presentation"
      title={crop.name}
    >
      <CropImage cropId={crop.id} imageClass="" letterClass={styles.cropLetter} name={crop.name} />
    </div>
  );
}

/** 손을 뗀 지점 아래의 칸을 찾는다. 끌고 있던 작물 자신은 잠시 비켜 준다. */
function cellUnder(node: HTMLElement | null, x: number, y: number) {
  const previous = node?.style.pointerEvents ?? "";
  if (node) node.style.pointerEvents = "none";
  const found = document.elementFromPoint(x, y)?.closest<HTMLElement>(`.${styles.cell}`);
  if (node) node.style.pointerEvents = previous;
  if (!found) return null;

  const grid = found.parentElement;
  const planterNode = found.closest<HTMLElement>(`.${styles.planter}`);
  const planterId = planterNode?.dataset.planter;
  if (!grid || !planterId) return null;

  const index = Array.prototype.indexOf.call(grid.children, found);
  const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  return { planterId, col: index % columns, row: Math.floor(index / columns) };
}

/* ------------------------------------------------------------------ 메모 */

function MemoNote({
  memo,
  planter,
  index,
  onSelect,
}: {
  memo: SpaceMemo;
  planter: StudioPlanter;
  index: number;
  onSelect: (id: string) => void;
}) {
  const size = planterSize(planter);

  return (
    <button
      className={styles.attachedNote}
      onClick={(event) => { event.stopPropagation(); onSelect(memo.id); }}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ left: planter.x + size.w + 18, top: planter.y + 14 + index * 68 }}
      type="button"
    >
      <strong>{planter.name} 메모</strong>
      {memo.body}
    </button>
  );
}
