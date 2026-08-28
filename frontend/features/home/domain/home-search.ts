import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";

/**
 * 홈 상단 검색바가 쓰는 계산
 *
 * 검색 대상은 "이미 홈이 불러온 실제 데이터" 뿐이다.
 *   내 재배 계획(seasons) · 내 재배 공간(spaces) · 작물 도감(crops)
 * 새 API 를 부르지 않고, 없는 결과를 지어내지 않는다.
 *
 * 자연어 질문에 답하는 기능(AI)은 지금 보류 상태라서 여기서 다루지 않는다.
 * 그래서 이 입력바는 "질문에 답하는 칸"이 아니라 "찾아서 이동하는 칸"이고,
 * 아래 빠른 이동 칩도 전부 실제로 존재하는 화면으로만 연결한다.
 */

export type HomeSearchKind = "plan" | "space" | "crop";

export interface HomeSearchHit {
  key: string;
  kind: HomeSearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** 실제 asset 이 있는 작물만 채워진다. */
  image: string | null;
}

export interface HomeSearchInput {
  seasons: readonly GrowingSeason[];
  spaces: readonly GrowingSpace[];
  crops: readonly CropReference[];
  cropImages: Readonly<Record<string, string | undefined>>;
  spaceLabels: Readonly<Record<string, string>>;
}

const MAX_PER_KIND = 4;
const MAX_TOTAL = 8;

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * 앞에서부터 맞으면 더 위로 올린다.
 * -1 이면 아예 걸리지 않은 것이다.
 */
function score(haystack: string, needle: string): number {
  const index = haystack.toLowerCase().indexOf(needle);
  if (index < 0) return -1;
  return index === 0 ? 0 : 1;
}

function best(fields: readonly string[], needle: string): number {
  let found = -1;
  for (const field of fields) {
    const value = score(field, needle);
    if (value === 0) return 0;
    if (value > 0) found = 1;
  }
  return found;
}

export function searchHome(query: string, input: HomeSearchInput): HomeSearchHit[] {
  const needle = normalizeQuery(query);
  if (needle.length === 0) return [];

  const spaceById = new Map(input.spaces.map((space) => [space.id, space]));

  const plans = pick(
    input.seasons.map((season) => ({
      hit: {
        key: `plan:${season.id}`,
        kind: "plan" as const,
        title: season.name,
        subtitle: `재배 계획 · ${spaceById.get(season.spaceId)?.name ?? "공간 미지정"}`,
        href: `/seasons/${season.id}/edit`,
        image: null,
      },
      rank: best([season.name, season.notes], needle),
    })),
  );

  const spaces = pick(
    input.spaces.map((space) => ({
      hit: {
        key: `space:${space.id}`,
        kind: "space" as const,
        title: space.name,
        subtitle: `재배 공간 · ${input.spaceLabels[space.type] ?? space.type} · ${space.widthCm}×${space.lengthCm}cm`,
        href: `/spaces/${space.id}/edit`,
        image: null,
      },
      rank: best([space.name, space.notes], needle),
    })),
  );

  const crops = pick(
    input.crops.map((crop) => ({
      hit: {
        key: `crop:${crop.id}`,
        kind: "crop" as const,
        title: crop.name,
        subtitle: `작물 가이드 · ${crop.familyName} · 심는 시기 ${crop.plantingPeriod.label}`,
        href: `/crops/${crop.id}`,
        image: input.cropImages[crop.id] ?? null,
      },
      rank: best([crop.name, crop.familyName, crop.summary], needle),
    })),
  );

  return [...plans, ...spaces, ...crops].slice(0, MAX_TOTAL);
}

function pick(rows: readonly { hit: HomeSearchHit; rank: number }[]): HomeSearchHit[] {
  return rows
    .filter((row) => row.rank >= 0)
    .sort((left, right) => left.rank - right.rank || left.hit.title.localeCompare(right.hit.title, "ko-KR"))
    .slice(0, MAX_PER_KIND)
    .map((row) => row.hit);
}

/* ------------------------------------------------------------ 빠른 이동 칩 */

export interface HomeQuickAction {
  key: string;
  label: string;
  href: string;
  /** 실제로 셀 수 있는 값만 넣는다. 셀 수 없으면 null 이고 배지를 그리지 않는다. */
  count: number | null;
}

/**
 * 칩은 전부 지금 존재하는 화면으로만 연결한다.
 * 값이 0인 칩(오늘 물 줄 일이 없을 때 등)은 아예 만들지 않는다.
 */
export function homeQuickActions(
  tasks: readonly CultivationTask[],
  today: string,
): HomeQuickAction[] {
  const pending = tasks.filter((task) => task.status === "pending");
  const watering = pending.filter((task) => task.type === "watering" && task.dueDate <= today);
  const overdue = pending.filter((task) => task.dueDate < today);
  const harvest = pending.filter((task) => task.type === "harvest" && task.dueDate <= today);

  const actions: HomeQuickAction[] = [];

  if (watering.length > 0) {
    actions.push({
      key: "watering",
      label: "오늘 물 줄 작물",
      href: `/seasons/${watering[0].seasonId}/watering`,
      count: watering.length,
    });
  }
  if (overdue.length > 0) {
    actions.push({
      key: "overdue",
      label: "기한 지난 일",
      href: `/seasons/${overdue[0].seasonId}/tasks`,
      count: overdue.length,
    });
  }
  if (harvest.length > 0) {
    actions.push({
      key: "harvest",
      label: "수확할 때가 된 작물",
      href: `/seasons/${harvest[0].seasonId}/tasks`,
      count: harvest.length,
    });
  }

  actions.push({ key: "crops", label: "심을 작물 찾아보기", href: "/crops", count: null });
  actions.push({ key: "spaces", label: "내 재배 공간", href: "/spaces", count: null });

  return actions;
}
