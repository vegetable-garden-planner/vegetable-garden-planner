import { planterCentre, type StudioGroup, type StudioPlanter, type StudioState } from "./studio-model.ts";

/**
 * 화분 그룹 (Figma Frame 방식)
 *
 * 캔버스에서 화분을 묶어 보기 위한 시각적 영역이다.
 * 크기는 실제 cm 가 아니라 캔버스 px 이고, 화분의 실제 크기와는 무관하다.
 * 소속은 사용자가 지정하지 않는다 — 화분 중심점이 영역 안에 있으면 그 그룹이다.
 *
 * 현재 API 에 그룹을 담을 자리가 없어 서버에 저장하지 않는다.
 */

export const MIN_GROUP_W = 100;
export const MIN_GROUP_H = 80;
export type ResizeDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const RESIZE_DIRS: readonly ResizeDir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export interface Rect { x: number; y: number; w: number; h: number }

export function pointInGroup(x: number, y: number, group: Rect): boolean {
  return x >= group.x && x <= group.x + group.w && y >= group.y && y <= group.y + group.h;
}

export function rectFromDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

/** 드래그가 너무 작으면 그룹을 만들지 않는다. */
export function isDrawable(rect: Rect): boolean {
  return rect.w >= 80 && rect.h >= 60;
}

/** 8방향 손잡이. 프레임만 커지고 작아진다 — 화분의 실제 cm 는 절대 바뀌지 않는다. */
export function resizeRect(base: Rect, dir: ResizeDir, dx: number, dy: number): Rect {
  let { x, y, w, h } = base;

  if (dir.includes("e")) w = Math.max(MIN_GROUP_W, base.w + dx);
  if (dir.includes("s")) h = Math.max(MIN_GROUP_H, base.h + dy);

  if (dir.includes("w")) {
    const proposed = base.w - dx;
    if (proposed >= MIN_GROUP_W) { x = base.x + dx; w = proposed; }
    else { x = base.x + base.w - MIN_GROUP_W; w = MIN_GROUP_W; }
  }
  if (dir.includes("n")) {
    const proposed = base.h - dy;
    if (proposed >= MIN_GROUP_H) { y = base.y + dy; h = proposed; }
    else { y = base.y + base.h - MIN_GROUP_H; h = MIN_GROUP_H; }
  }

  return { x, y, w, h };
}

/** 프레임 크기가 바뀐 뒤, 그 프레임이 품은 화분을 다시 계산한다. */
export function syncMembershipFromFrame(state: StudioState, groupId: string): void {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return;

  const inside = state.planters
    .filter((planter) => {
      const centre = planterCentre(planter);
      return pointInGroup(centre.x, centre.y, group);
    })
    .map((planter) => planter.id);

  for (const other of state.groups) {
    if (other.id !== groupId) {
      other.planterIds = other.planterIds.filter((id) => !inside.includes(id));
    }
  }
  group.planterIds = inside;
}

/** 화분 하나를 옮긴 뒤, 그 화분이 어느 그룹에 드는지 다시 계산한다. */
export function syncMembershipFromPlanter(state: StudioState, planterId: string): void {
  const planter = state.planters.find((item) => item.id === planterId);
  if (!planter) return;

  const centre = planterCentre(planter);
  const containing = [...state.groups].reverse()
    .find((group) => pointInGroup(centre.x, centre.y, group));

  for (const group of state.groups) {
    group.planterIds = group.planterIds.filter((id) => id !== planterId);
  }
  if (containing && !containing.planterIds.includes(planterId)) {
    containing.planterIds.push(planterId);
  }
}

/** 끌고 있는 화분이 지금 어느 그룹 위에 있는지 (Drop 대상 강조용) */
export function groupUnderPlanter(
  state: StudioState,
  planter: StudioPlanter,
  dx: number,
  dy: number,
): StudioGroup | null {
  const centre = planterCentre(planter);
  const x = centre.x + dx;
  const y = centre.y + dy;
  return [...state.groups].reverse().find((group) => pointInGroup(x, y, group)) ?? null;
}

export function nextGroupName(groups: readonly StudioGroup[]): string {
  const used = new Set(groups.map((group) => group.name));
  for (let index = 1; index <= groups.length + 1; index += 1) {
    const name = `새 그룹 ${index}`;
    if (!used.has(name)) return name;
  }
  return `새 그룹 ${groups.length + 1}`;
}
