import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CropPlacement } from "../domain/garden-layout.ts";

export interface CropPlantCount {
  cropId: string;
  cropName: string;
  count: number;
}

export interface PlantCountSummary {
  totalCount: number;
  cropTypeCount: number;
  crops: readonly CropPlantCount[];
}

export class MissingCropReferenceError extends Error {
  constructor(cropId: string) {
    super(`배치된 작물 기준 정보를 찾을 수 없습니다: ${cropId}`);
    this.name = "MissingCropReferenceError";
  }
}

export function calculatePlantCount(
  placements: readonly CropPlacement[],
  cropReferences: readonly CropReference[],
): PlantCountSummary {
  const cropsById = new Map(cropReferences.map((crop) => [crop.id, crop]));
  const countsByCropId = new Map<string, number>();

  for (const placement of placements) {
    if (!cropsById.has(placement.cropId)) {
      throw new MissingCropReferenceError(placement.cropId);
    }

    const currentCount = countsByCropId.get(placement.cropId) ?? 0;
    countsByCropId.set(placement.cropId, currentCount + 1);
  }

  const crops = cropReferences.flatMap((crop) => {
    const count = countsByCropId.get(crop.id);
    return count === undefined
      ? []
      : [{ cropId: crop.id, cropName: crop.name, count }];
  });

  return {
    totalCount: placements.length,
    cropTypeCount: crops.length,
    crops,
  };
}
