import type { CropReference } from "./crop-reference.ts";

export interface CropPageMetadata {
  title: string;
  description: string;
}

const FALLBACK_METADATA: CropPageMetadata = {
  title: "작물 정보 | 심어봄",
  description: "심어봄에서 작물별 심는 시기와 재배 방법을 확인하세요.",
};

export function createCropPageMetadata(
  cropId: string,
  crops: readonly CropReference[],
): CropPageMetadata {
  const crop = crops.find((candidate) => candidate.id === cropId);
  if (!crop) return FALLBACK_METADATA;

  return {
    title: `${crop.name} 재배 정보 | 심어봄`,
    description: crop.summary,
  };
}
