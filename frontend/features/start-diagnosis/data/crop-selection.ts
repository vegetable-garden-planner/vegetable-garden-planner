export const CROP_OPTIONS = [
  {
    id: "lettuce",
    name: "상추",
    difficulty: "쉬움",
    image: "/figma/image3.png",
  },
  {
    id: "cherry-tomato",
    name: "방울토마토",
    difficulty: "보통",
    image: "/figma/image7.png",
  },
  {
    id: "basil",
    name: "바질",
    difficulty: "쉬움",
    image: "/figma/image5.png",
  },
  {
    id: "chili",
    name: "고추",
    difficulty: "보통",
    image: "/figma/crop-chili-v1.png",
  },
  {
    id: "spinach",
    name: "시금치",
    difficulty: "쉬움",
    image: "/figma/crop-spinach-v1.png",
  },
  {
    id: "strawberry",
    name: "딸기",
    difficulty: "어려움",
    image: "/figma/image6.png",
  },
] as const;

export type CropOption = (typeof CROP_OPTIONS)[number];
export type CropId = CropOption["id"];
export type PlantingSlot = readonly [number, number];

export const DEFAULT_SELECTED_CROPS: readonly CropId[] = ["lettuce", "basil"];

export function getCropOption(cropId: CropId) {
  return CROP_OPTIONS.find((crop) => crop.id === cropId)!;
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
