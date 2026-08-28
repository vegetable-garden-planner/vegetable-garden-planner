import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";

/**
 * 배치 편집기 상태 모델
 *
 * 프로토타입과 같은 구조를 쓰되, 값은 전부 실제 API 데이터에서 나온다.
 *   화분(planter)  ← GrowingSpace × 그 공간을 쓰는 재배 계획
 *   작물 배치      ← ContainerPlacement.position / GardenLayout.placements
 *   그룹           ← 서버 저장 자리가 없어 이 기기에만 남는다
 *
 * 캔버스는 재배 계획 하나가 아니라 사용자의 재배 공간 전체를 담는다.
 * 그래서 화분 하나는 (재배 계획, 공간) 짝이고, 서로 다른 계획의 화분이 한 캔버스에 함께 놓인다.
 * 계획을 합치는 것이 아니다. 배치 데이터는 언제나 자기 계획에만 저장된다.
 *
 * 작물 위치는 픽셀이 아니라 화분 내부의 col/row 로만 관리한다.
 * 확대·창 크기가 달라져도 같은 칸에 남는다.
 */

/** 1cm 를 몇 px 로 그릴지 (프로토타입과 동일) */
export const PX_PER_CM = 5.2;
export const MIN_PLANTER_W = 190;
export const MIN_PLANTER_H = 125;
/** 화분 안쪽 격자 여백 (CSS .plant-grid inset) */
export const GRID_INSET = 13;

/** 캔버스에서 화분 하나를 가리키는 열쇠. 같은 공간이라도 계획이 다르면 다른 화분이다. */
export function planterKey(seasonId: string, spaceId: string): string {
  return `${seasonId}::${spaceId}`;
}

export interface StudioPlanter {
  /** planterKey(seasonId, spaceId) */
  id: string;
  /** 실제 GrowingSpace.id */
  spaceId: string;
  /** 이 화분이 속한 재배 계획 */
  seasonId: string;
  seasonName: string;
  /** 계획 시작 월 (1~12). 계절 판정 기준이라 계획마다 다르다. */
  seasonMonth: number | null;
  /** 컨테이너 배치 API 를 쓰는지, 텃밭 격자 API 를 쓰는지 */
  mode: "container" | "garden";
  name: string;
  /** 실제 등록 크기 (cm) */
  w: number;
  h: number;
  d: number | null;
  location: string;
  sun: string;
  spaceType: GrowingSpace["type"];
  /** 캔버스 좌표 (px). 서버 저장 자리가 없어 이 기기에만 남는다. */
  x: number;
  y: number;
  cols: number;
  rows: number;
  /** 서버 낙관적 잠금용 */
  version: number;
}

export interface StudioPlacement {
  id: string;
  cropId: string;
  planterId: string;
  /** 이 배치가 저장되는 재배 계획. 계획을 넘나드는 이동은 하지 않는다. */
  seasonId: string;
  col: number;
  row: number;
  /** 실제로 저장된 심은 날짜. 없으면 null (지어내지 않는다) */
  plantedAt: string | null;
}

export interface StudioGroup {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  planterIds: string[];
}

export interface StudioState {
  planters: StudioPlanter[];
  placements: StudioPlacement[];
  groups: StudioGroup[];
}

/** 화분 크기 → 칸 수. 10cm 를 한 칸으로 보고 최소 2칸. (프로토타입과 동일) */
export function gridColumns(widthCm: number): number {
  return Math.max(2, Math.round(widthCm / 10));
}

export function gridRows(lengthCm: number): number {
  return Math.max(2, Math.round(lengthCm / 10));
}

export function planterSize(planter: StudioPlanter): { w: number; h: number } {
  return {
    w: Math.max(MIN_PLANTER_W, planter.w * PX_PER_CM),
    h: Math.max(MIN_PLANTER_H, planter.h * PX_PER_CM),
  };
}

export function planterCentre(planter: StudioPlanter): { x: number; y: number } {
  const size = planterSize(planter);
  return { x: planter.x + size.w / 2, y: planter.y + size.h / 2 };
}

/** 칸 중심의 실제 위치(cm). 간격 계산의 기준이다. */
export function physicalCenter(planter: StudioPlanter, col: number, row: number) {
  return {
    x: (col + 0.5) * (planter.w / planter.cols),
    y: (row + 0.5) * (planter.h / planter.rows),
  };
}

export function distanceCm(
  planter: StudioPlanter,
  a: { col: number; row: number },
  b: { col: number; row: number },
): number {
  const left = physicalCenter(planter, a.col, a.row);
  const right = physicalCenter(planter, b.col, b.row);
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function findPlanter(state: StudioState, id: string): StudioPlanter | undefined {
  return state.planters.find((planter) => planter.id === id);
}

export function findPlacement(state: StudioState, id: string): StudioPlacement | undefined {
  return state.placements.find((placement) => placement.id === id);
}

export function placementsOf(state: StudioState, planterId: string): StudioPlacement[] {
  return state.placements.filter((placement) => placement.planterId === planterId);
}

export function isCellTaken(
  state: StudioState,
  planterId: string,
  col: number,
  row: number,
  ignoreId?: string,
): boolean {
  return state.placements.some((placement) => (
    placement.planterId === planterId
    && placement.col === col
    && placement.row === row
    && placement.id !== ignoreId
  ));
}

/** 격자 점유율 (%) */
export function occupancy(state: StudioState, planter: StudioPlanter): number {
  const total = planter.cols * planter.rows;
  if (total === 0) return 0;
  return Math.min(100, Math.round(placementsOf(state, planter.id).length / total * 100));
}

/**
 * 예상 생육 공간 (%)
 * 한 포기가 지름 = 권장 간격인 원을 차지한다고 보고 화분 면적과 비교한다.
 * 권장 간격은 실제 작물 데이터(plantSpacingCm)에서 온다.
 */
export function growthDensity(
  state: StudioState,
  planter: StudioPlanter,
  cropsById: ReadonlyMap<string, CropReference>,
): number {
  const area = Math.max(1, planter.w * planter.h);
  let growth = 0;
  for (const placement of placementsOf(state, planter.id)) {
    const crop = cropsById.get(placement.cropId);
    if (!crop) continue;
    const radius = growthWidthCm(crop) / 2;
    growth += Math.PI * radius * radius;
  }
  return Math.round(growth / area * 100);
}

/**
 * 자란 뒤 필요한 폭(cm).
 * 실제 API 에 별도 생육 폭 필드가 없어 권장 간격을 그대로 쓴다.
 * (없는 수치를 만들어 내지 않는다)
 */
export function growthWidthCm(crop: CropReference): number {
  return Math.max(1, crop.plantSpacingCm);
}

/** 빈 칸 중 처음 나오는 자리. 복제·자동 정리에 쓴다. */
export function firstFreeCell(
  state: StudioState,
  planter: StudioPlanter,
  ignoreId?: string,
): { col: number; row: number } | null {
  for (let row = 0; row < planter.rows; row += 1) {
    for (let col = 0; col < planter.cols; col += 1) {
      if (!isCellTaken(state, planter.id, col, row, ignoreId)) return { col, row };
    }
  }
  return null;
}
