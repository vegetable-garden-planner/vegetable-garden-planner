import assert from "node:assert/strict";
import test from "node:test";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CropPlacement } from "../domain/garden-layout.ts";
import {
  calculatePlantCount,
  MissingCropReferenceError,
} from "./calculate-plant-count.ts";

const CROPS = [
  createCrop("lettuce", "상추"),
  createCrop("tomato", "토마토"),
] satisfies readonly CropReference[];

test("배치가 없으면 포기 수와 작물 종류가 모두 0이다", () => {
  const summary = calculatePlantCount([], CROPS);

  assert.deepEqual(summary, {
    totalCount: 0,
    cropTypeCount: 0,
    crops: [],
  });
});

test("격자 한 칸의 작물 배치를 한 포기로 세고 작물별 수량을 합산한다", () => {
  const placements: CropPlacement[] = [
    { cellIndex: 0, cropId: "tomato" },
    { cellIndex: 1, cropId: "lettuce" },
    { cellIndex: 2, cropId: "lettuce" },
  ];

  const summary = calculatePlantCount(placements, CROPS);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.cropTypeCount, 2);
  assert.deepEqual(summary.crops, [
    { cropId: "lettuce", cropName: "상추", count: 2 },
    { cropId: "tomato", cropName: "토마토", count: 1 },
  ]);
});

test("기준 정보가 없는 작물은 수량에서 조용히 제외하지 않고 오류로 알린다", () => {
  assert.throws(
    () => calculatePlantCount([{ cellIndex: 0, cropId: "missing" }], CROPS),
    MissingCropReferenceError,
  );
});

function createCrop(id: string, name: string): CropReference {
  return {
    id,
    name,
    familyName: "테스트과",
    category: "leaf",
    difficulty: "easy",
    plantingMaterial: "seedling",
    supportedSpaces: ["garden"],
    plantingPeriod: { startMonth: 3, endMonth: 4, label: "3~4월" },
    harvestPeriod: { startMonth: 5, endMonth: 6, label: "5~6월" },
    plantSpacingCm: 20,
    minPotDepthCm: null,
    sunRequirement: null,
    needsSupport: false,
    summary: "테스트 작물",
    sourceId: "test-source",
  };
}
