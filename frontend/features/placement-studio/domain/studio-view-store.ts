import { planterSize, type StudioGroup, type StudioPlanter } from "./studio-model.ts";

/**
 * 캔버스 배치(화분의 x·y 좌표)와 그룹 프레임을 이 기기에 저장한다.
 *
 * 서버에는 이 두 가지를 담을 자리가 없다.
 *  - GrowingSpace 에는 캔버스 좌표 필드가 없다.
 *  - 그룹(Frame)에 해당하는 리소스가 API 에 없다.
 *
 * 그래서 "서버에 저장됐다"고 말하지 않는다. 화면에도 이 기기에만 남는다고 적는다.
 * 작물 배치 자체는 여기가 아니라 실제 API 에 저장된다.
 */

const VERSION = 2;

interface ViewSnapshot {
  version: number;
  spots: Record<string, { x: number; y: number }>;
  groups: StudioGroup[];
  extraSpaceIds: string[];
}

export interface StudioView {
  spots: Record<string, { x: number; y: number }>;
  groups: StudioGroup[];
  /**
   * 캔버스에 올려 뒀지만 아직 작물이 하나도 없는 (계획, 공간) 짝.
   *
   * 서버는 "이 계획이 쓰는 화분"을 계획의 대표 공간과 배치가 저장된 공간으로만 알 수 있다.
   * (ContainerPlacement 에는 spaceId 가 있지만, 작물이 없으면 그 행 자체가 없다.)
   * 작물을 넣고 저장하면 서버 기준으로도 이 계획의 화분이 되므로, 그때까지만 여기서 기억한다.
   */
  extraSpaceIds: string[];
}

/** 캔버스는 재배 계획 하나가 아니라 사용자의 재배 공간 전체를 담으므로 열쇠도 하나다. */
const STORAGE_KEY = "simeobom.studio.canvas.v2";

const EMPTY_VIEW: StudioView = { spots: {}, groups: [], extraSpaceIds: [] };

export function readStudioView(): StudioView {
  if (typeof window === "undefined") return EMPTY_VIEW;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_VIEW;
    const parsed = JSON.parse(raw) as Partial<ViewSnapshot>;
    if (parsed.version !== VERSION) return EMPTY_VIEW;

    return {
      spots: readSpots(parsed.spots),
      groups: Array.isArray(parsed.groups) ? parsed.groups.filter(isGroup) : [],
      extraSpaceIds: Array.isArray(parsed.extraSpaceIds)
        ? parsed.extraSpaceIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return EMPTY_VIEW;
  }
}

/** 아직 작물이 없어 서버가 이 계획의 화분으로 알 수 없는 화분 목록을 갱신한다. */
export function writeExtraSpaces(extraSpaceIds: readonly string[]): void {
  writeSnapshot({ ...readStudioView(), extraSpaceIds: [...extraSpaceIds] });
}

export function writeStudioView(planters: readonly StudioPlanter[], groups: readonly StudioGroup[]): void {
  if (typeof window === "undefined") return;

  const spots: Record<string, { x: number; y: number }> = {};
  for (const planter of planters) {
    spots[planter.id] = { x: Math.round(planter.x), y: Math.round(planter.y) };
  }

  writeSnapshot({ ...readStudioView(), spots, groups: [...groups] });
}

function writeSnapshot(view: StudioView): void {
  if (typeof window === "undefined") return;
  try {
    const snapshot: ViewSnapshot = { version: VERSION, ...view };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 저장 공간이 없어도 편집은 계속된다.
  }
}

const GAP_X = 70;
const GAP_Y = 90;
const ROW_LIMIT = 1500;
const ORIGIN = { x: 160, y: 170 };

/**
 * 화분을 겹치지 않게 왼쪽부터 늘어놓는다.
 *
 * 화분마다 실제 크기가 달라서 고정 간격으로 두면 큰 화분이 옆 화분을 덮는다.
 * 실제 그려지는 크기를 재서 폭만큼 밀고, 줄이 길어지면 다음 줄로 내린다.
 */
export function packedSpots(planters: readonly StudioPlanter[]): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  let x = ORIGIN.x;
  let y = ORIGIN.y;
  let rowHeight = 0;

  for (const planter of planters) {
    const size = planterSize(planter);
    if (x > ORIGIN.x && x + size.w > ORIGIN.x + ROW_LIMIT) {
      x = ORIGIN.x;
      y += rowHeight + GAP_Y;
      rowHeight = 0;
    }
    spots.push({ x, y });
    x += size.w + GAP_X;
    rowHeight = Math.max(rowHeight, size.h);
  }

  return spots;
}

/** 화분 자동 정렬 (프로토타입의 ▦ 버튼) */
export function arrangeSpots(planters: readonly StudioPlanter[]): StudioPlanter[] {
  const spots = packedSpots(planters);
  return planters.map((planter, index) => ({ ...planter, ...spots[index] }));
}

function readSpots(value: unknown): Record<string, { x: number; y: number }> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, { x: number; y: number }> = {};

  for (const [id, spot] of Object.entries(value as Record<string, unknown>)) {
    if (typeof spot !== "object" || spot === null) continue;
    const point = spot as { x?: unknown; y?: unknown };
    if (typeof point.x !== "number" || typeof point.y !== "number") continue;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    out[id] = { x: point.x, y: point.y };
  }

  return out;
}

function isGroup(value: unknown): value is StudioGroup {
  if (typeof value !== "object" || value === null) return false;
  const group = value as Record<string, unknown>;
  return typeof group.id === "string"
    && typeof group.name === "string"
    && typeof group.x === "number"
    && typeof group.y === "number"
    && typeof group.w === "number"
    && typeof group.h === "number"
    && Array.isArray(group.planterIds);
}
