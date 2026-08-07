import type {
  CropPeriod,
  CropReference,
  PlantingMaterial,
} from "../../crop-catalog/domain/crop-reference.ts";
import type { CropPlacement } from "../../garden-layout/domain/garden-layout.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";

export const CULTIVATION_TASK_TYPES = [
  "watering",
  "sowing",
  "transplanting",
  "fertilizing",
  "support",
  "harvest",
  "other",
] as const;

export type CultivationTaskType = (typeof CULTIVATION_TASK_TYPES)[number];
export type CultivationTaskStatus = "pending" | "completed";

export interface CultivationTask {
  id: string;
  seasonId: string;
  cropId: string;
  type: CultivationTaskType;
  title: string;
  dueDate: string;
  notes: string;
  status: CultivationTaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleGeneration =
  | { valid: true; tasks: CultivationTask[] }
  | { valid: false; message: string };

interface TaskDraft {
  cropId: string;
  type: CultivationTaskType;
  title: string;
  dueDate: string;
  notes: string;
}

export function generateCultivationSchedule(
  season: Pick<GrowingSeason, "id" | "startDate" | "endDate">,
  placements: readonly CropPlacement[],
  crops: readonly CropReference[],
  createId: () => string,
  generatedAt: string,
): ScheduleGeneration {
  if (!isDateOnly(season.startDate) || !isDateOnly(season.endDate)) {
    return { valid: false, message: "시즌의 재배 기간이 올바르지 않습니다." };
  }
  if (season.endDate < season.startDate) {
    return { valid: false, message: "시즌 종료일은 시작일보다 빠를 수 없습니다." };
  }
  if (placements.length === 0) {
    return { valid: false, message: "먼저 격자에 키울 작물을 배치해 주세요." };
  }

  const placedCropIds = new Set(placements.map((placement) => placement.cropId));
  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  const missingCropId = [...placedCropIds].find((cropId) => !cropsById.has(cropId));
  if (missingCropId) {
    return {
      valid: false,
      message: `배치된 작물 기준 정보를 찾을 수 없습니다: ${missingCropId}`,
    };
  }

  const placedCrops = crops.filter((crop) => placedCropIds.has(crop.id));
  const drafts: TaskDraft[] = [];
  for (const crop of placedCrops) {
    const result = createCropTaskDrafts(season, crop);
    if (!result.valid) return result;
    drafts.push(...result.drafts);
  }

  const tasks = drafts
    .sort(compareTaskDrafts)
    .map((draft) => ({
      id: createId(),
      seasonId: season.id,
      ...draft,
      status: "pending" as const,
      completedAt: null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    }));

  return { valid: true, tasks };
}

function createCropTaskDrafts(
  season: Pick<GrowingSeason, "startDate" | "endDate">,
  crop: CropReference,
): { valid: true; drafts: TaskDraft[] } | { valid: false; message: string } {
  const plantingDate = findFirstMatchingDate(
    season.startDate,
    season.endDate,
    crop.plantingPeriod,
  );
  if (!plantingDate) {
    return {
      valid: false,
      message: `${crop.name}의 권장 심는 시기와 시즌 기간이 겹치지 않습니다.`,
    };
  }

  const harvestDate = findFirstMatchingDate(
    plantingDate,
    season.endDate,
    crop.harvestPeriod,
  );
  if (!harvestDate) {
    return {
      valid: false,
      message: `${crop.name}의 권장 수확 시기와 시즌 기간이 겹치지 않습니다.`,
    };
  }

  return {
    valid: true,
    drafts: [
      createPlantingTask(crop, plantingDate),
      {
        cropId: crop.id,
        type: "harvest",
        title: `${crop.name} 수확 시작하기`,
        dueDate: harvestDate,
        notes: `기준 수확 시기: ${crop.harvestPeriod.label}. 생육 상태와 날씨에 따라 조정하세요.`,
      },
    ],
  };
}

function createPlantingTask(crop: CropReference, dueDate: string): TaskDraft {
  return {
    cropId: crop.id,
    type: crop.plantingMaterial === "seedling" ? "transplanting" : "sowing",
    title: getPlantingTitle(crop.name, crop.plantingMaterial),
    dueDate,
    notes: `기준 심는 시기: ${crop.plantingPeriod.label}. 지역과 날씨에 따라 조정하세요.`,
  };
}

function getPlantingTitle(name: string, material: PlantingMaterial) {
  if (material === "seedling") return `${name} 모종 심기`;
  if (material === "seed-potato") return `${name} 씨감자 심기`;
  return `${name} 파종하기`;
}

function findFirstMatchingDate(
  startDate: string,
  endDate: string,
  period: CropPeriod,
): string | null {
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const endTimestamp = Date.parse(`${endDate}T00:00:00.000Z`);

  while (cursor.getTime() <= endTimestamp) {
    const month = cursor.getUTCMonth() + 1;
    if (month >= period.startMonth && month <= period.endMonth) {
      return cursor.toISOString().slice(0, 10);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return null;
}

function compareTaskDrafts(left: TaskDraft, right: TaskDraft) {
  return left.dueDate.localeCompare(right.dueDate)
    || left.title.localeCompare(right.title, "ko-KR");
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString().slice(0, 10) === value;
}
