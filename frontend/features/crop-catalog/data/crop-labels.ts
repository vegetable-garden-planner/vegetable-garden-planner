import type {
  CropCategory,
  CropDifficulty,
  PlantingMaterial,
} from "@/features/crop-catalog/domain/crop-reference";
import type { GrowingSpaceType, SunlightExposure } from "@/shared/domain/growing-environment";

export const CROP_CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: "잎채소",
  fruit: "열매채소",
  root: "뿌리채소",
  legume: "콩류",
  tuber: "덩이줄기",
  flower: "꽃",
};

export const CROP_DIFFICULTY_LABELS: Record<CropDifficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  challenging: "관리가 필요해요",
};

export const PLANTING_MATERIAL_LABELS: Record<PlantingMaterial, string> = {
  seed: "씨앗",
  seedling: "모종",
  "seed-potato": "씨감자",
  "potted-plant": "화분 식물",
  "cut-flower": "꽃다발·절화",
};

export const GROWING_SPACE_LABELS: Record<GrowingSpaceType, string> = {
  indoor: "실내 화분",
  balcony: "베란다",
  garden: "마당·텃밭",
};

export const SUNLIGHT_LABELS: Record<SunlightExposure, string> = {
  low: "2시간 미만",
  partial: "2~5시간",
  full: "6시간 이상",
};
