/**
 * 화분 배치 격자 캔버스
 *
 * 참고: 팀원이 만든 정적 프로토타입(심어봄_배치편집기_그룹리사이즈_전체분석.html)의
 * 화분 하나 = 격자(cols×rows) 개념을 그대로 따르되, "화분 안에 또 여러 개별
 * 화분을 새로 추가"하는 부분은 새 DB 테이블이 필요해 이번 범위에서 뺐다.
 * 대신 이미 있는 재배 공간(GrowingSpace) 하나를 그 자체로 격자 하나로 그린다.
 *
 * 칸 크기는 고정 10cm — 프로토타입의 예시 화분(80×30→8×3, 40×40→4×4,
 * 100×20→10×2)이 전부 10cm 칸으로 딱 맞아떨어지는 걸 그대로 재사용했다.
 * 저장은 새 테이블 없이 기존 position(JSON) 필드를 {order} 대신
 * {cells:[{col,row}]}로 채워서 쓴다.
 */

import type { SunlightExposure } from "@/shared/domain/growing-environment";

export const CONTAINER_CELL_SIZE_CM = 10;
const SUNLIGHT_RANK: Record<SunlightExposure, number> = { low: 0, partial: 1, full: 2 };

export interface ContainerGrid {
  columns: number;
  rows: number;
  cellSizeCm: number;
}

export interface GridCropSpacing {
  id: string;
  plantSpacingCm: number;
  minPotDepthCm: number | null;
  sunRequirement: SunlightExposure | null;
}

export interface GridSpace {
  widthCm: number;
  lengthCm: number;
  depthCm: number | null;
  sunlight: SunlightExposure | null;
}

export interface GridCell {
  col: number;
  row: number;
}

export interface GridCellPlacement extends GridCell {
  cropId: string;
}

/** 재배 공간 크기를 10cm 칸으로 나눈 격자. 최소 1×1. */
export function computeContainerGrid(space: Pick<GridSpace, "widthCm" | "lengthCm">): ContainerGrid {
  return {
    columns: Math.max(1, Math.floor(space.widthCm / CONTAINER_CELL_SIZE_CM)),
    rows: Math.max(1, Math.floor(space.lengthCm / CONTAINER_CELL_SIZE_CM)),
    cellSizeCm: CONTAINER_CELL_SIZE_CM,
  };
}

export function isCellWithinGrid(cell: GridCell, grid: ContainerGrid): boolean {
  return cell.col >= 0 && cell.col < grid.columns && cell.row >= 0 && cell.row < grid.rows;
}

export function isCellOccupied(
  cell: GridCell,
  placements: readonly GridCellPlacement[],
  ignoreCropId?: string,
): boolean {
  return placements.some(
    (placement) => placement.col === cell.col && placement.row === cell.row && placement.cropId !== ignoreCropId,
  );
}

/**
 * 격자에서 아직 안 채워진 칸을 앞에서부터 채운다. 이미 유효한 칸에 있는
 * 기존 배치는 그대로 두고, 범위를 벗어났거나 다른 작물이 이미 차지한
 * 칸이거나 개수가 남는 만큼만 새로 배정한다 — 수량을 늘리거나 화분을
 * 바꿔도 기존 위치가 흐트러지지 않는다.
 */
export function fillGridCells(
  wanted: number,
  grid: ContainerGrid,
  existing: readonly GridCell[],
  occupiedByOthers: readonly GridCell[] = [],
): GridCell[] {
  const blocked = new Set(occupiedByOthers.map((cell) => `${cell.col}:${cell.row}`));
  const kept = existing
    .filter((cell) => isCellWithinGrid(cell, grid) && !blocked.has(`${cell.col}:${cell.row}`))
    .slice(0, wanted);
  const takenKeys = new Set(kept.map((cell) => `${cell.col}:${cell.row}`));
  const result = [...kept];

  outer: for (let row = 0; row < grid.rows && result.length < wanted; row += 1) {
    for (let col = 0; col < grid.columns && result.length < wanted; col += 1) {
      const key = `${col}:${row}`;
      if (takenKeys.has(key) || blocked.has(key)) continue;
      takenKeys.add(key);
      result.push({ col, row });
      if (result.length >= wanted) break outer;
    }
  }

  return result;
}

export type FitLevel = "good" | "warning" | "bad" | "unknown";

export interface CellValidation {
  depth: FitLevel;
  sun: FitLevel;
  spacing: FitLevel;
  overall: FitLevel;
  /** 가장 가까운 다른 작물까지 거리(cm). 주변에 아무것도 없으면 null. */
  nearestDistanceCm: number | null;
}

const OVERALL_RANK: Record<FitLevel, number> = { bad: 0, warning: 1, unknown: 2, good: 3 };

/**
 * 칸 하나에 작물을 놓았을 때 실제 데이터로 판단 가능한 것만 검증한다.
 * "배치 이유" 같은 지어낸 문구는 만들지 않는다 — placement-summary.ts와
 * 같은 원칙.
 */
export function validateCellPlacement(
  cell: GridCell,
  crop: GridCropSpacing,
  space: GridSpace,
  grid: ContainerGrid,
  neighbors: readonly GridCellPlacement[],
): CellValidation {
  const depth = depthFit(crop, space);
  const sun = sunFit(crop, space);
  const nearest = nearestNeighborDistanceCm(cell, neighbors, grid);
  const spacing = spacingFit(crop, nearest);

  const overall = [depth, sun, spacing].reduce(
    (worst, level) => (OVERALL_RANK[level] < OVERALL_RANK[worst] ? level : worst),
    "good" as FitLevel,
  );

  return { depth, sun, spacing, overall, nearestDistanceCm: nearest };
}

function depthFit(crop: GridCropSpacing, space: GridSpace): FitLevel {
  if (space.depthCm === null || crop.minPotDepthCm === null) return "unknown";
  if (crop.minPotDepthCm > space.depthCm) return "bad";
  return "good";
}

function sunFit(crop: GridCropSpacing, space: GridSpace): FitLevel {
  if (space.sunlight === null || crop.sunRequirement === null) return "unknown";
  const gap = SUNLIGHT_RANK[crop.sunRequirement] - SUNLIGHT_RANK[space.sunlight];
  if (gap <= 0) return "good";
  return gap === 1 ? "warning" : "bad";
}

function nearestNeighborDistanceCm(
  cell: GridCell,
  neighbors: readonly GridCellPlacement[],
  grid: ContainerGrid,
): number | null {
  if (neighbors.length === 0) return null;
  let nearest = Infinity;
  for (const neighbor of neighbors) {
    const dx = (cell.col - neighbor.col) * grid.cellSizeCm;
    const dy = (cell.row - neighbor.row) * grid.cellSizeCm;
    const distance = Math.hypot(dx, dy);
    if (distance < nearest) nearest = distance;
  }
  return Number.isFinite(nearest) ? nearest : null;
}

function spacingFit(crop: GridCropSpacing, nearestDistanceCm: number | null): FitLevel {
  if (nearestDistanceCm === null) return "good";
  if (nearestDistanceCm >= crop.plantSpacingCm) return "good";
  return nearestDistanceCm >= crop.plantSpacingCm * 0.7 ? "warning" : "bad";
}

/**
 * 빈 칸마다 적합도를 매겨 점수 높은 순으로 정렬한다. 이미 채워진 칸은
 * 후보에서 뺀다.
 */
export function recommendCellsForCrop(
  crop: GridCropSpacing,
  space: GridSpace,
  grid: ContainerGrid,
  occupied: readonly GridCellPlacement[],
): { cell: GridCell; validation: CellValidation; score: number }[] {
  const results: { cell: GridCell; validation: CellValidation; score: number }[] = [];

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.columns; col += 1) {
      const cell = { col, row };
      if (isCellOccupied(cell, occupied)) continue;
      const validation = validateCellPlacement(cell, crop, space, grid, occupied);
      results.push({ cell, validation, score: scoreOf(validation) });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function scoreOf(validation: CellValidation): number {
  let score = 100;
  for (const level of [validation.depth, validation.sun, validation.spacing]) {
    if (level === "warning") score -= 15;
    if (level === "bad") score -= 35;
  }
  return score;
}
