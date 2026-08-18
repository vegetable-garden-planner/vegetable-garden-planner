import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import {
  getRecommendation,
  isCompleteDiagnosis,
  resolveSpaceType,
  type DiagnosisAnswers,
} from "./diagnosis.ts";

const BASE_ANSWERS: DiagnosisAnswers = {
  space: "outdoor",
  sunlight: "full",
  careTime: "high",
  goal: "edible",
};

const FIXTURE_CROPS: readonly CropReference[] = [
  createCrop({ id: "easy-garden-leaf", name: "상추", difficulty: "easy", supportedSpaces: ["balcony", "garden"] }),
  createCrop({ id: "hard-garden-fruit", name: "토마토", category: "fruit", difficulty: "challenging", supportedSpaces: ["garden"] }),
  createCrop({ id: "indoor-flower", name: "호접란", category: "flower", difficulty: "normal", supportedSpaces: ["indoor"] }),
  createCrop({ id: "normal-garden-root", name: "당근", category: "root", difficulty: "normal", supportedSpaces: ["garden"] }),
  createCrop({ id: "easy-garden-legume", name: "강낭콩", category: "legume", difficulty: "easy", supportedSpaces: ["garden"] }),
];

test("답변이 비어 있으면 진단 완료로 판단하지 않는다", () => {
  assert.equal(isCompleteDiagnosis({}), false);
});

test("모든 답변이 있으면 진단 완료로 판단한다", () => {
  assert.equal(isCompleteDiagnosis(BASE_ANSWERS), true);
});

test("공간이 없는 사용자는 실내 화분 기준으로 진단한다", () => {
  assert.equal(resolveSpaceType("none"), "indoor");
  assert.equal(resolveSpaceType("indoor"), "indoor");
  assert.equal(resolveSpaceType("balcony"), "balcony");
  assert.equal(resolveSpaceType("outdoor"), "garden");
});

test("선택한 공간을 지원하는 기준정보만 추천한다", () => {
  const result = getRecommendation(BASE_ANSWERS, FIXTURE_CROPS);

  assert.equal(result.spaceTypeKey, "garden");
  assert.equal(result.spaceTypeLabel, "마당·텃밭");
  assert.equal(result.crops.every((crop) => crop.supportedSpaces.includes("garden")), true);
  assert.equal(result.fallback, null);
});

test("돌볼 시간이 적으면 난이도가 높은 작물을 추천하지 않는다", () => {
  const result = getRecommendation({ ...BASE_ANSWERS, careTime: "low" }, FIXTURE_CROPS);

  assert.deepEqual(result.crops.map((crop) => crop.id), ["easy-garden-legume", "easy-garden-leaf"]);
});

test("꽃을 원하면 꽃 기준정보만 추천한다", () => {
  const result = getRecommendation({ ...BASE_ANSWERS, space: "indoor", goal: "flowers" }, FIXTURE_CROPS);

  assert.deepEqual(result.crops.map((crop) => crop.id), ["indoor-flower"]);
  assert.equal(result.careTimeNote, null);
});

test("공간에는 맞지만 관리 시간과 맞지 않으면 추천과 함께 주의 문구를 제공한다", () => {
  const result = getRecommendation(
    { space: "indoor", sunlight: "partial", careTime: "low", goal: "flowers" },
    FIXTURE_CROPS,
  );

  assert.deepEqual(result.crops.map((crop) => crop.id), ["indoor-flower"]);
  assert.equal(result.fallback, null);
  assert.match(result.careTimeNote ?? "", /관리 시간/);
});

test("추천은 최대 3종까지만 제공한다", () => {
  const manyCrops = Array.from({ length: 6 }, (_unused, index) =>
    createCrop({ id: `crop-${index}`, name: `작물${index}`, difficulty: "easy", supportedSpaces: ["garden"] }));

  assert.equal(getRecommendation(BASE_ANSWERS, manyCrops).crops.length, 3);
});

test("실내에서 먹을 수 있는 기준정보가 없으면 다른 공간을 대안으로 안내한다", () => {
  const result = getRecommendation(
    { space: "none", sunlight: "partial", careTime: "medium", goal: "edible" },
    CROP_REFERENCES,
  );

  assert.deepEqual(result.crops, []);
  assert.equal(result.fallback?.spaceTypeKey, "balcony");
  assert.ok((result.fallback?.crops.length ?? 0) > 0);
  assert.match(result.fallback?.message ?? "", /베란다/);
});

test("마당에서 볼 수 있는 꽃 기준정보가 없으면 실내를 대안으로 안내한다", () => {
  const result = getRecommendation(
    { space: "outdoor", sunlight: "full", careTime: "high", goal: "flowers" },
    CROP_REFERENCES,
  );

  assert.deepEqual(result.crops, []);
  assert.equal(result.fallback?.spaceTypeKey, "indoor");
  assert.equal(result.fallback?.crops.every((crop) => crop.category === "flower"), true);
});

test("기준정보가 비어 있으면 추천도 대안도 만들지 않는다", () => {
  const result = getRecommendation(BASE_ANSWERS, []);

  assert.deepEqual(result.crops, []);
  assert.equal(result.fallback, null);
});

function createCrop(overrides: Partial<CropReference> & Pick<CropReference, "id" | "name">): CropReference {
  return {
    familyName: "테스트과",
    category: "leaf",
    difficulty: "easy",
    plantingMaterial: "seedling",
    supportedSpaces: ["garden"],
    plantingPeriod: { startMonth: 4, endMonth: 4, label: "4월" },
    harvestPeriod: { startMonth: 6, endMonth: 6, label: "6월" },
    plantSpacingCm: 20,
    summary: "테스트용 기준정보입니다.",
    sourceId: "test-source",
    ...overrides,
  };
}
