import type { ContainerPlacementInput } from "../../container-placement/domain/container-placement.ts";
import type { CropPlacement, GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import {
  gridColumns,
  gridRows,
  isCellTaken,
  planterKey,
  type StudioPlacement,
  type StudioPlanter,
  type StudioState,
} from "./studio-model.ts";

/** 화분이 속한 재배 계획 */
export interface PlanRef {
  id: string;
  name: string;
  /** 계획 시작 월 (1~12). 계절 판정 기준. */
  month: number | null;
  mode: "container" | "garden";
}

/**
 * 실제 API ↔ 편집기 상태 변환
 *
 * 저장 가능한 곳
 *  - 화분 자체 : /spaces (이름·크기·깊이·위치·햇빛)
 *  - 작물 위치 : /seasons/{id}/container-placements 의 position
 *                (Swagger 상 "형식은 프론트엔드가 정하며 서버는 그대로 저장·반환")
 *                → { col, row, cols, rows, plantedAt } 을 담는다
 *  - 텃밭 격자 : /seasons/{id}/layout 의 cellIndex (= row * columns + col)
 *
 * 저장할 곳이 없는 것
 *  - 화분의 캔버스 좌표(x, y), 그룹 → 이 기기에만 남는다
 */

export interface CellPosition {
  col: number;
  row: number;
  cols: number;
  rows: number;
  plantedAt: string | null;
}

export function readCellPosition(position: unknown): CellPosition | null {
  if (typeof position !== "object" || position === null) return null;
  const value = position as Record<string, unknown>;
  if (!Number.isInteger(value.col) || !Number.isInteger(value.row)) return null;
  if ((value.col as number) < 0 || (value.row as number) < 0) return null;

  return {
    col: value.col as number,
    row: value.row as number,
    cols: Number.isInteger(value.cols) ? (value.cols as number) : 0,
    rows: Number.isInteger(value.rows) ? (value.rows as number) : 0,
    plantedAt: typeof value.plantedAt === "string" ? value.plantedAt : null,
  };
}

export function toStudioPlanter(
  space: GrowingSpace,
  plan: PlanRef,
  spot: { x: number; y: number },
): StudioPlanter {
  return {
    id: planterKey(plan.id, space.id),
    spaceId: space.id,
    seasonId: plan.id,
    seasonName: plan.name,
    seasonMonth: plan.month,
    mode: plan.mode,
    name: space.name,
    w: space.widthCm,
    h: space.lengthCm,
    d: space.depthCm,
    location: space.address ?? "",
    sun: space.sunlight ?? "",
    spaceType: space.type,
    x: spot.x,
    y: spot.y,
    cols: gridColumns(space.widthCm),
    rows: gridRows(space.lengthCm),
    version: space.version,
  };
}

interface ContainerRow {
  id: string;
  seasonId: string;
  spaceId: string;
  cropId: string;
  quantity: number;
  position: unknown;
}

export interface LoadResult {
  placements: StudioPlacement[];
  /** 칸이 모자라 놓지 못한 실제 저장 수량. 조용히 버리지 않는다. */
  unplaced: { cropId: string; count: number }[];
}

/**
 * 서버에 저장된 화분 배치를 편집기 상태로 옮긴다.
 *
 * col/row 가 이미 있으면 그대로 쓴다.
 * 없는 예전 데이터(추천 결과처럼 "상추 8포기")는 저장된 수량만큼 빈 칸을 앞에서 채운다.
 * 없는 작물을 만들어 내는 것이 아니라, 저장된 수량을 그대로 옮기는 것뿐이다.
 */
export function toStudioPlacements(
  rows: readonly ContainerRow[],
  planters: readonly StudioPlanter[],
): LoadResult {
  const byId = new Map(planters.map((planter) => [planter.id, planter]));
  const placements: StudioPlacement[] = [];
  const unplaced: { cropId: string; count: number }[] = [];
  const known = rows.filter((row) => byId.has(planterKey(row.seasonId, row.spaceId)));
  const draft: StudioState = { planters: [...planters], placements, groups: [] };

  for (const row of known) {
    const planter = byId.get(planterKey(row.seasonId, row.spaceId))!;
    const cell = readCellPosition(row.position);
    if (!cell) continue;
    if (cell.col >= planter.cols || cell.row >= planter.rows) continue;
    if (isCellTaken(draft, planter.id, cell.col, cell.row)) continue;
    placements.push({
      id: row.id,
      cropId: row.cropId,
      planterId: planter.id,
      seasonId: row.seasonId,
      col: cell.col,
      row: cell.row,
      plantedAt: cell.plantedAt,
    });
  }

  let sequence = 0;
  for (const row of known) {
    const planter = byId.get(planterKey(row.seasonId, row.spaceId))!;
    if (readCellPosition(row.position)) continue;

    let left = Math.max(1, Math.floor(row.quantity));
    for (const cell of freeCells(draft, planter)) {
      if (left === 0) break;
      sequence += 1;
      placements.push({
        id: `${row.id}-${sequence}`,
        cropId: row.cropId,
        planterId: planter.id,
        seasonId: row.seasonId,
        col: cell.col,
        row: cell.row,
        plantedAt: null,
      });
      left -= 1;
    }
    if (left > 0) unplaced.push({ cropId: row.cropId, count: left });
  }

  return { placements: sortPlacements(placements), unplaced };
}

/** 한 재배 계획 몫의 배치만 뽑는다. 배치는 언제나 자기 계획에만 저장된다. */
export function toContainerInputs(
  state: StudioState,
  seasonId: string,
): ContainerPlacementInput[] {
  const byId = new Map(state.planters.map((planter) => [planter.id, planter]));

  return sortPlacements([...state.placements])
    .filter((placement) => placement.seasonId === seasonId && byId.has(placement.planterId))
    .map((placement) => {
      const planter = byId.get(placement.planterId)!;
      const position: CellPosition = {
        col: placement.col,
        row: placement.row,
        cols: planter.cols,
        rows: planter.rows,
        plantedAt: placement.plantedAt,
      };
      return { spaceId: planter.spaceId, cropId: placement.cropId, quantity: 1, position };
    });
}

/* ------------------------------------------------------------ 텃밭 격자 */

export function fromLayout(layout: GardenLayout, planter: StudioPlanter): StudioPlacement[] {
  return sortPlacements(layout.placements
    .filter((placement) => placement.cellIndex < layout.columns * layout.rows)
    .map((placement) => ({
      id: `${layout.seasonId}-${placement.cellIndex}`,
      cropId: placement.cropId,
      planterId: planter.id,
      seasonId: layout.seasonId,
      col: placement.cellIndex % layout.columns,
      row: Math.floor(placement.cellIndex / layout.columns),
      plantedAt: null,
    })));
}

export function toLayoutPlacements(
  state: StudioState,
  planter: StudioPlanter,
  columns: number,
): CropPlacement[] {
  return sortPlacements([...state.placements])
    .filter((placement) => placement.planterId === planter.id)
    .map((placement) => ({
      cellIndex: placement.row * columns + placement.col,
      cropId: placement.cropId,
    }));
}

/** 지금 비어 있는 칸을 왼쪽 위부터 차례로 돌려준다. */
function* freeCells(state: StudioState, planter: StudioPlanter) {
  for (let row = 0; row < planter.rows; row += 1) {
    for (let col = 0; col < planter.cols; col += 1) {
      if (!isCellTaken(state, planter.id, col, row)) yield { col, row };
    }
  }
}

function sortPlacements(placements: StudioPlacement[]): StudioPlacement[] {
  return placements.sort((left, right) => (
    left.planterId.localeCompare(right.planterId) || left.row - right.row || left.col - right.col
  ));
}
