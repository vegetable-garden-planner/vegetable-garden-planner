import type { GrowingSpaceType } from "@/shared/domain/growing-environment";

export type CropCategory = "leaf" | "fruit" | "root" | "legume" | "tuber";
export type CropDifficulty = "easy" | "normal" | "challenging";
export type PlantingMaterial = "seed" | "seedling" | "seed-potato";

export interface CropPeriod {
  startMonth: number;
  endMonth: number;
  label: string;
}

export interface CropReference {
  id: string;
  name: string;
  familyName: string;
  category: CropCategory;
  difficulty: CropDifficulty;
  plantingMaterial: PlantingMaterial;
  supportedSpaces: readonly GrowingSpaceType[];
  plantingPeriod: CropPeriod;
  harvestPeriod: CropPeriod;
  plantSpacingCm: number;
  summary: string;
  sourceId: string;
}

export interface CropSource {
  id: string;
  organization: string;
  title: string;
  url: string;
  reviewedAt: string;
}

export interface CropFilters {
  query: string;
  category: CropCategory | "all";
  space: GrowingSpaceType | "all";
}

export function filterCropReferences(
  crops: readonly CropReference[],
  filters: CropFilters,
): CropReference[] {
  const query = filters.query.trim().toLocaleLowerCase("ko-KR");

  return crops.filter((crop) => {
    if (filters.category !== "all" && crop.category !== filters.category) {
      return false;
    }
    if (
      filters.space !== "all"
      && !crop.supportedSpaces.includes(filters.space)
    ) {
      return false;
    }
    if (!query) return true;

    return [crop.name, crop.familyName, crop.summary].some((value) =>
      value.toLocaleLowerCase("ko-KR").includes(query),
    );
  });
}

export function validateCropReferenceData(
  crops: readonly CropReference[],
  sources: readonly CropSource[],
): string[] {
  const errors: string[] = [];
  const cropIds = new Set<string>();
  const cropNames = new Set<string>();
  const sourceIds = new Set(sources.map((source) => source.id));

  if (crops.length === 0) errors.push("작물 데이터가 비어 있습니다.");

  for (const crop of crops) {
    if (cropIds.has(crop.id)) errors.push(`중복 작물 ID: ${crop.id}`);
    if (cropNames.has(crop.name)) errors.push(`중복 작물 이름: ${crop.name}`);
    if (!sourceIds.has(crop.sourceId)) {
      errors.push(`${crop.name}: 출처를 찾을 수 없습니다.`);
    }
    if (!isValidPeriod(crop.plantingPeriod)) {
      errors.push(`${crop.name}: 심는 시기가 올바르지 않습니다.`);
    }
    if (!isValidPeriod(crop.harvestPeriod)) {
      errors.push(`${crop.name}: 수확 시기가 올바르지 않습니다.`);
    }
    if (!Number.isInteger(crop.plantSpacingCm) || crop.plantSpacingCm <= 0) {
      errors.push(`${crop.name}: 포기 간격은 양의 정수여야 합니다.`);
    }
    if (crop.supportedSpaces.length === 0) {
      errors.push(`${crop.name}: 지원 공간이 필요합니다.`);
    }

    cropIds.add(crop.id);
    cropNames.add(crop.name);
  }

  return errors;
}

function isValidPeriod(period: CropPeriod) {
  return Number.isInteger(period.startMonth)
    && Number.isInteger(period.endMonth)
    && period.startMonth >= 1
    && period.endMonth <= 12
    && period.startMonth <= period.endMonth
    && period.label.trim().length > 0;
}
