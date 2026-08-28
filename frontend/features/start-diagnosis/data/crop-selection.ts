import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";

/**
 * /start 진단에서 고를 수 있는 작물
 *
 * 예전에는 이 파일이 자체 작물 목록(바질·딸기 등)을 들고 있어서
 * 실제 서비스 작물 목록과 ID가 어긋났다. 그래서 진단에서 고른 작물을
 * 배치·일정으로 넘길 수 없었다.
 *
 * 지금은 서비스 기준 데이터(CROP_REFERENCES)에서 그대로 가져온다.
 * 이 MVP의 범위는 베란다·화분에서 키우는 식용 채소이므로
 * supportedSpaces에 balcony가 있는 채소만 쓴다.
 */

/** 이번 MVP에서 쓰는 작물. 모두 CROP_REFERENCES에 실재하는 ID다. */
export const MVP_CROP_IDS = [
  "lettuce",
  "spinach",
  "young-radish",
  "green-onion",
  "carrot",
  "tomato",
] as const;

export type CropId = (typeof MVP_CROP_IDS)[number];

export function isCropId(value: string): value is CropId {
  return (MVP_CROP_IDS as readonly string[]).includes(value);
}

const REFERENCE_BY_ID = new Map(CROP_REFERENCES.map((crop) => [crop.id, crop]));

/** 진단 화면에서 쓰는 표시용 정보. 이름·난이도는 서비스 데이터에서 온다. */
export interface CropOption {
  id: CropId;
  name: string;
  difficulty: string;
  /** 사진이 있는 작물만 채워진다. 없으면 화면에서 글자 배지로 대신한다. */
  image: string | null;
}

const DIFFICULTY_LABELS = {
  easy: "쉬움",
  normal: "보통",
  challenging: "관리 필요",
} as const;

/** 사진이 준비된 작물만 연결한다. 없는 작물은 억지로 다른 사진을 쓰지 않는다. */
const CROP_PHOTOS: Partial<Record<CropId, string>> = {
  lettuce: "/figma/image3.png",
  spinach: "/figma/crop-spinach-v1.png",
  tomato: "/figma/image7.png",
};

export const CROP_OPTIONS: readonly CropOption[] = MVP_CROP_IDS.map((id) => {
  const reference = REFERENCE_BY_ID.get(id);
  if (!reference) {
    throw new Error(`작물 기준 정보를 찾을 수 없습니다: ${id}`);
  }

  return {
    id,
    name: reference.name,
    difficulty: DIFFICULTY_LABELS[reference.difficulty],
    image: CROP_PHOTOS[id] ?? null,
  };
});

export type PlantingSlot = readonly [number, number];

export const DEFAULT_SELECTED_CROPS: readonly CropId[] = ["lettuce", "spinach"];

export function getCropOption(cropId: CropId): CropOption {
  const option = CROP_OPTIONS.find((crop) => crop.id === cropId);
  if (!option) throw new Error(`작물 정보를 찾을 수 없습니다: ${cropId}`);
  return option;
}

export function toggleCropSelection(current: readonly CropId[], cropId: CropId): CropId[] {
  if (current.includes(cropId)) {
    return current.filter((selectedCrop) => selectedCrop !== cropId);
  }

  if (current.length >= CROP_OPTIONS.length) return [...current];
  return [...current, cropId];
}

export function getPlantingSlots(count: number): readonly PlantingSlot[] {
  if (count <= 0) return [];
  if (count === 1) return [[0, 0]];
  if (count === 2) return [[-0.27, 0], [0.27, 0]];
  if (count === 3) return [[-0.32, 0], [0, 0.08], [0.32, 0]];
  if (count === 4) return [
    [-0.25, 0.2], [0.25, 0.2],
    [-0.25, -0.2], [0.25, -0.2],
  ];
  if (count === 5) return [
    [-0.32, 0.2], [0, 0.2], [0.32, 0.2],
    [-0.18, -0.2], [0.18, -0.2],
  ];
  return [
    [-0.32, 0.2], [0, 0.2], [0.32, 0.2],
    [-0.32, -0.2], [0, -0.2], [0.32, -0.2],
  ];
}
