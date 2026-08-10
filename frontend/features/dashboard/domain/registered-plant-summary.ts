import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import {
  getGrowingSeasonStatus,
  type GrowingSeason,
  type GrowingSeasonStatus,
} from "../../growing-season/domain/growing-season.ts";

export interface RegisteredPlantSummary {
  seasonId: string;
  seasonName: string;
  cropId: string;
  cropName: string;
  cropHref: string | null;
  careHint: string;
  status: GrowingSeasonStatus;
  startDate: string;
}

const STATUS_ORDER: Readonly<Record<GrowingSeasonStatus, number>> = {
  active: 0,
  planned: 1,
  completed: 2,
};

export function createRegisteredPlantSummaries(
  seasons: readonly GrowingSeason[],
  crops: readonly CropReference[],
  today: string,
  limit = 4,
): RegisteredPlantSummary[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("표시할 식물 수는 0 이상의 정수여야 합니다.");
  }

  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  return seasons
    .filter((season) => Boolean(season.featuredCropId))
    .map((season) => toSummary(season, cropsById, today))
    .sort(compareSummaries)
    .slice(0, limit);
}

function toSummary(
  season: GrowingSeason,
  cropsById: ReadonlyMap<string, CropReference>,
  today: string,
): RegisteredPlantSummary {
  const cropId = season.featuredCropId ?? "";
  const crop = cropsById.get(cropId);
  return {
    seasonId: season.id,
    seasonName: season.name,
    cropId,
    cropName: crop?.name ?? "정보가 삭제된 식물",
    cropHref: crop ? `/crops/${crop.id}` : null,
    careHint: crop?.careGuide?.watering ?? crop?.summary ?? "식물 기준 정보를 다시 선택해 주세요.",
    status: getGrowingSeasonStatus(season, today),
    startDate: season.startDate,
  };
}

function compareSummaries(
  left: RegisteredPlantSummary,
  right: RegisteredPlantSummary,
) {
  return STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
    || right.startDate.localeCompare(left.startDate)
    || left.cropName.localeCompare(right.cropName, "ko-KR");
}
