import type { CropId } from "./crop-selection.ts";

export type CropCategory = "leafy" | "herb" | "fruit";
export type CropLocation = "balcony" | "window" | "indoor";

export type CropRule = {
  name: string;
  minDepthCm: number;
  minSunHours: number;
  preferredSunHours: readonly [number, number];
  spacingXCm: number;
  spacingZCm: number;
  allowedLocations: readonly CropLocation[];
  category: CropCategory;
  mark: string;
  thumbnail: string;
};

export const CROP_RULES: Readonly<Record<CropId, CropRule>> = {
  lettuce: {
    name: "상추",
    minDepthCm: 15,
    minSunHours: 2,
    preferredSunHours: [3, 5],
    spacingXCm: 12,
    spacingZCm: 12,
    allowedLocations: ["balcony", "window", "indoor"],
    category: "leafy",
    mark: "/figma/crop-mark-lettuce-v1.png",
    thumbnail: "/figma/image3.png",
  },
  spinach: {
    name: "시금치",
    minDepthCm: 15,
    minSunHours: 2,
    preferredSunHours: [2, 5],
    spacingXCm: 12,
    spacingZCm: 12,
    allowedLocations: ["balcony", "window", "indoor"],
    category: "leafy",
    mark: "/figma/crop-mark-spinach-v1.png",
    thumbnail: "/figma/crop-spinach-v1.png",
  },
  basil: {
    name: "바질",
    minDepthCm: 18,
    minSunHours: 4,
    preferredSunHours: [5, 7],
    spacingXCm: 16,
    spacingZCm: 16,
    allowedLocations: ["balcony", "window"],
    category: "herb",
    mark: "/figma/crop-mark-basil-v1.png",
    thumbnail: "/figma/image5.png",
  },
  strawberry: {
    name: "딸기",
    minDepthCm: 18,
    minSunHours: 4,
    preferredSunHours: [5, 7],
    spacingXCm: 20,
    spacingZCm: 18,
    allowedLocations: ["balcony", "window"],
    category: "fruit",
    mark: "/figma/crop-mark-strawberry-v2.png",
    thumbnail: "/figma/image6.png",
  },
  chili: {
    name: "고추",
    minDepthCm: 25,
    minSunHours: 6,
    preferredSunHours: [6, 8],
    spacingXCm: 30,
    spacingZCm: 25,
    allowedLocations: ["balcony", "window"],
    category: "fruit",
    mark: "/figma/crop-mark-chili-v1.png",
    thumbnail: "/figma/crop-chili-v1.png",
  },
  "cherry-tomato": {
    name: "방울토마토",
    minDepthCm: 25,
    minSunHours: 6,
    preferredSunHours: [6, 8],
    spacingXCm: 35,
    spacingZCm: 30,
    allowedLocations: ["balcony", "window"],
    category: "fruit",
    mark: "/figma/crop-mark-cherry-tomato-v1.png",
    thumbnail: "/figma/image7.png",
  },
};

export const SUNLIGHT_HOURS = {
  "2h": 2,
  "3-5h": 4,
  "6h+": 6,
} as const;

export const MAX_SEEDLINGS: Readonly<Record<CropId, number>> = {
  lettuce: 8,
  spinach: 8,
  basil: 5,
  strawberry: 4,
  chili: 2,
  "cherry-tomato": 2,
};

export const CROP_RULE_ORDER: readonly CropId[] = [
  "lettuce",
  "spinach",
  "basil",
  "strawberry",
  "chili",
  "cherry-tomato",
];
