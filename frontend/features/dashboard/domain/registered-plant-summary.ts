import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CultivationRecord } from "../../cultivation-record/domain/cultivation-record.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import {
  getGrowingSeasonStatus,
  type GrowingSeason,
  type GrowingSeasonStatus,
} from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";

export interface RegisteredPlantSummary {
  seasonId: string;
  seasonName: string;
  spaceId: string;
  spaceName: string;
  cropId: string;
  cropName: string;
  cropHref: string | null;
  careHint: string;
  status: GrowingSeasonStatus;
  startDate: string;
  nextTaskTitle: string | null;
  latestRecordNote: string | null;
  needsAttention: boolean;
}

const STATUS_ORDER: Readonly<Record<GrowingSeasonStatus, number>> = {
  active: 0,
  planned: 1,
  completed: 2,
};

export function createRegisteredPlantSummaries(
  seasons: readonly GrowingSeason[],
  crops: readonly CropReference[],
  spaces: readonly GrowingSpace[],
  tasks: readonly CultivationTask[],
  records: readonly CultivationRecord[],
  attentionSeasonIds: ReadonlySet<string>,
  today: string,
  limit = 4,
): RegisteredPlantSummary[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("표시할 식물 수는 0 이상의 정수여야 합니다.");
  }

  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  const spacesById = new Map(spaces.map((space) => [space.id, space]));
  const nextTaskBySeasonId = buildNextTaskIndex(tasks);
  const latestRecordBySeasonId = buildLatestRecordIndex(records);

  return seasons
    .filter((season) => Boolean(season.featuredCropId))
    .map((season) => toSummary(
      season,
      cropsById,
      spacesById,
      nextTaskBySeasonId,
      latestRecordBySeasonId,
      attentionSeasonIds,
      today,
    ))
    .sort(compareSummaries)
    .slice(0, limit);
}

function toSummary(
  season: GrowingSeason,
  cropsById: ReadonlyMap<string, CropReference>,
  spacesById: ReadonlyMap<string, GrowingSpace>,
  nextTaskBySeasonId: ReadonlyMap<string, CultivationTask>,
  latestRecordBySeasonId: ReadonlyMap<string, CultivationRecord>,
  attentionSeasonIds: ReadonlySet<string>,
  today: string,
): RegisteredPlantSummary {
  const cropId = season.featuredCropId ?? "";
  const crop = cropsById.get(cropId);
  const space = spacesById.get(season.spaceId);

  return {
    seasonId: season.id,
    seasonName: season.name,
    spaceId: season.spaceId,
    spaceName: space?.name ?? "연결 공간 없음",
    cropId,
    cropName: crop?.name ?? "정보가 삭제된 식물",
    cropHref: crop ? `/crops/${crop.id}` : null,
    careHint: crop?.careGuide?.watering ?? crop?.summary ?? "식물 기준 정보를 다시 선택해 주세요.",
    status: getGrowingSeasonStatus(season, today),
    startDate: season.startDate,
    nextTaskTitle: nextTaskBySeasonId.get(season.id)?.title ?? null,
    latestRecordNote: latestRecordBySeasonId.get(season.id)?.notes || null,
    needsAttention: attentionSeasonIds.has(season.id),
  };
}

function buildNextTaskIndex(tasks: readonly CultivationTask[]): Map<string, CultivationTask> {
  const bySeasonId = new Map<string, CultivationTask>();
  for (const task of tasks) {
    if (task.status !== "pending") continue;
    const current = bySeasonId.get(task.seasonId);
    if (!current || task.dueDate < current.dueDate) bySeasonId.set(task.seasonId, task);
  }
  return bySeasonId;
}

function buildLatestRecordIndex(records: readonly CultivationRecord[]): Map<string, CultivationRecord> {
  const bySeasonId = new Map<string, CultivationRecord>();
  for (const record of records) {
    const current = bySeasonId.get(record.seasonId);
    if (!current || record.occurredAt > current.occurredAt) bySeasonId.set(record.seasonId, record);
  }
  return bySeasonId;
}

function compareSummaries(
  left: RegisteredPlantSummary,
  right: RegisteredPlantSummary,
) {
  return STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
    || right.startDate.localeCompare(left.startDate)
    || left.cropName.localeCompare(right.cropName, "ko-KR");
}
