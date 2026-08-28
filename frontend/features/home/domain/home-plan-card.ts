import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CultivationRecord } from "../../cultivation-record/domain/cultivation-record.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import { getGrowingSeasonStatus, type GrowingSeason, type GrowingSeasonStatus } from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import { calculateProgress, daysBetween } from "./home-dashboard.ts";

/**
 * 메인 홈 카드 한 장에 담을 값
 *
 * 전부 실제 저장 데이터에서만 나온다.
 *   재배 계획(seasons) · 공간(spaces) · 배치(container-placements, layouts)
 *   일정(tasks) · 기록(records)
 *
 * 없는 정보는 만들지 않고 null 로 둔다. 화면에서는 null 인 항목을 아예 그리지 않는다.
 * "상태 좋아요", "햇빛 충분함" 처럼 시스템이 판단할 수 없는 값은 여기에 없다.
 */

export interface HomePlanCrop {
  cropId: string;
  name: string;
  /** 실제 이미지가 있는 작물만 채워진다. 없으면 화면에서 이름 배지로 대신한다. */
  image: string | null;
  /** 이 계획에 배치된 포기 수. 배치가 없으면 null. */
  quantity: number | null;
}

export interface HomePlanCard {
  seasonId: string;
  name: string;
  spaceName: string;
  spaceLabel: string;
  status: GrowingSeasonStatus;
  startDate: string;
  endDate: string;
  /** 시작일 기준 재배 일수. 아직 시작 전이면 null. */
  growingDay: number | null;
  /** 기간 대비 진행률(0~100). */
  progress: number;
  crops: HomePlanCrop[];
  /** 가장 가까운 미완료 작업. 없으면 null. */
  nextTask: { title: string; dueDate: string; inDays: number } | null;
  /** 기한이 지난 미완료 작업 수. 0이면 경고를 그리지 않는다. */
  overdueCount: number;
  /** 이 계획에 실제로 저장된 가장 최근 기록. 없으면 null. */
  latestNote: { text: string; occurredAt: string } | null;
  placementHref: string;
  tasksHref: string;
  recordsHref: string;
}

export interface HomePlanInput {
  crops: readonly CropReference[];
  cropImages: Readonly<Record<string, string | undefined>>;
  layouts: readonly GardenLayout[];
  placements: readonly { seasonId: string; cropId: string; quantity: number }[];
  records: readonly CultivationRecord[];
  seasons: readonly GrowingSeason[];
  spaceLabels: Readonly<Record<string, string>>;
  spaces: readonly GrowingSpace[];
  tasks: readonly CultivationTask[];
  today: string;
}

const STATUS_ORDER: Record<GrowingSeasonStatus, number> = { active: 0, planned: 1, completed: 2 };

export function createHomePlanCards(input: HomePlanInput): HomePlanCard[] {
  const spaceById = new Map(input.spaces.map((space) => [space.id, space]));
  const cropById = new Map(input.crops.map((crop) => [crop.id, crop]));

  return [...input.seasons]
    .sort((left, right) => {
      const byStatus = STATUS_ORDER[getGrowingSeasonStatus(left, input.today)]
        - STATUS_ORDER[getGrowingSeasonStatus(right, input.today)];
      return byStatus || right.startDate.localeCompare(left.startDate);
    })
    .map((season) => toCard(season, input, spaceById, cropById));
}

function toCard(
  season: GrowingSeason,
  input: HomePlanInput,
  spaceById: ReadonlyMap<string, GrowingSpace>,
  cropById: ReadonlyMap<string, CropReference>,
): HomePlanCard {
  const space = spaceById.get(season.spaceId);
  const status = getGrowingSeasonStatus(season, input.today);
  const started = input.today >= season.startDate;

  const pending = input.tasks
    .filter((task) => task.seasonId === season.id && task.status === "pending")
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const nextTask = pending[0];
  const overdueCount = pending.filter((task) => task.dueDate < input.today).length;

  const latestRecord = input.records
    .filter((record) => record.seasonId === season.id && record.notes.trim().length > 0)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];

  return {
    seasonId: season.id,
    name: season.name,
    spaceName: space?.name ?? "연결된 공간 없음",
    spaceLabel: space ? input.spaceLabels[space.type] ?? "" : "",
    status,
    startDate: season.startDate,
    endDate: season.endDate,
    growingDay: started ? Math.max(1, daysBetween(season.startDate, input.today) + 1) : null,
    progress: calculateProgress(season, input.today),
    crops: collectCrops(season, input, cropById),
    nextTask: nextTask
      ? {
          title: nextTask.title,
          dueDate: nextTask.dueDate,
          inDays: daysBetween(input.today, nextTask.dueDate),
        }
      : null,
    overdueCount,
    latestNote: latestRecord
      ? { text: latestRecord.notes.trim(), occurredAt: latestRecord.occurredAt.slice(0, 10) }
      : null,
    placementHref: space?.type === "garden"
      ? `/seasons/${season.id}/layout`
      : `/seasons/${season.id}/placements`,
    tasksHref: `/seasons/${season.id}/tasks`,
    recordsHref: `/seasons/${season.id}/records`,
  };
}

/**
 * 이 계획에 실제로 배치된 작물만 모은다.
 * 화분 배치 → 텃밭 격자 → 대표 작물 순으로 찾고, 없으면 빈 배열이다.
 */
function collectCrops(
  season: GrowingSeason,
  input: HomePlanInput,
  cropById: ReadonlyMap<string, CropReference>,
): HomePlanCrop[] {
  const quantities = new Map<string, number>();

  for (const placement of input.placements) {
    if (placement.seasonId !== season.id) continue;
    quantities.set(placement.cropId, (quantities.get(placement.cropId) ?? 0) + placement.quantity);
  }

  if (quantities.size === 0) {
    const layout = input.layouts.find((item) => item.seasonId === season.id);
    for (const placement of layout?.placements ?? []) {
      quantities.set(placement.cropId, (quantities.get(placement.cropId) ?? 0) + 1);
    }
  }

  if (quantities.size === 0 && season.featuredCropId) {
    // 배치는 아직 없지만 대표 작물은 정해 둔 계획. 수량은 모르므로 null 로 둔다.
    const reference = cropById.get(season.featuredCropId);
    if (reference) {
      return [{
        cropId: reference.id,
        name: reference.name,
        image: input.cropImages[reference.id] ?? null,
        quantity: null,
      }];
    }
  }

  return [...quantities.entries()]
    .map(([cropId, quantity]) => {
      const reference = cropById.get(cropId);
      return {
        cropId,
        name: reference?.name ?? cropId,
        image: input.cropImages[cropId] ?? null,
        quantity,
      };
    })
    .sort((left, right) => right.quantity! - left.quantity! || left.name.localeCompare(right.name, "ko-KR"));
}

/**
 * 홈 상단 문구 — 시스템이 실제로 아는 사실만 말한다.
 * 작물 건강 상태처럼 판단할 근거가 없는 말은 하지 않는다.
 */
export function createHomeHeadline(cards: readonly HomePlanCard[], todayTaskCount: number): string {
  if (cards.length === 0) return "아직 시작한 재배 계획이 없어요.";
  if (todayTaskCount > 0) return `오늘 해야 할 일이 ${todayTaskCount}개 있어요.`;

  const active = cards.filter((card) => card.status === "active").length;
  if (active > 0) return `${active}개의 재배를 진행하고 있어요.`;

  return `${cards.length}개의 재배 계획을 관리하고 있어요.`;
}
