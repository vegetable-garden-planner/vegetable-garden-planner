import assert from "node:assert/strict";
import test from "node:test";
import { createGardenRecommendation } from "./garden-recommendation.ts";
import { addDays, createPlanDraft, toPlacementInputs, toSpaceType, toSunlightExposure } from "./plan-draft.ts";
import type { GardenConfiguration } from "./garden-configuration.ts";

const configuration: GardenConfiguration = {
  planter: { widthCm: 60, heightCm: 25, depthCm: 20, count: 3 },
  sunlight: { duration: "6h+", location: "balcony" },
  preferences: { selectedCrops: ["lettuce", "spinach"] },
};

function build(count = 3) {
  const config = { ...configuration, planter: { ...configuration.planter, count } };
  const recommendation = createGardenRecommendation({
    planter: config.planter,
    selectedCrops: config.preferences.selectedCrops,
    sunlight: config.sunlight,
  });
  return { config, draft: createPlanDraft(config, recommendation, "2026-03-01"), recommendation };
}

test("화분 개수만큼 공간을 만든다", () => {
  for (const count of [1, 3, 5]) {
    const { draft } = build(count);
    assert.equal(draft.spaces.length, count, `화분 ${count}개인데 공간이 ${draft.spaces.length}개`);
  }
});

test("공간 크기는 진단에서 입력한 값을 그대로 쓴다", () => {
  const { draft } = build();
  assert.equal(draft.spaces[0].widthCm, 60);
  assert.equal(draft.spaces[0].lengthCm, 20);
  assert.equal(draft.spaces[0].depthCm, 25);
});

test("환경은 서비스 값으로 옮겨진다", () => {
  assert.equal(toSpaceType("balcony"), "balcony");
  assert.equal(toSpaceType("window"), "indoor");
  assert.equal(toSpaceType("indoor"), "indoor");
  assert.equal(toSunlightExposure("2h"), "low");
  assert.equal(toSunlightExposure("3-5h"), "partial");
  assert.equal(toSunlightExposure("6h+"), "full");

  const { draft } = build();
  assert.equal(draft.spaces[0].type, "balcony");
  assert.equal(draft.spaces[0].sunlight, "full");
});

test("추천된 작물과 포기 수가 배치로 그대로 옮겨진다", () => {
  const { draft, recommendation } = build();
  const spaceIds = draft.spaces.map((_, index) => `space-${index}`);
  const placements = toPlacementInputs(draft, spaceIds);

  const expected = recommendation.planters.flatMap((planter, index) => (
    planter.crops.map((crop) => ({
      spaceId: `space-${index}`,
      cropId: crop.cropId,
      quantity: crop.seedlingCount,
    }))
  ));

  assert.deepEqual(
    placements.map(({ spaceId, cropId, quantity }) => ({ spaceId, cropId, quantity })),
    expected,
  );
});

test("배치 순서는 position.order 로 남는다", () => {
  const { draft } = build();
  const placements = toPlacementInputs(draft, draft.spaces.map((_, i) => `space-${i}`));
  placements.forEach((placement, index) => {
    assert.deepEqual(placement.position, { order: index });
  });
});

test("재배 계획 기간은 시작일부터 90일이다", () => {
  const { draft } = build();
  assert.equal(draft.season.startDate, "2026-03-01");
  assert.equal(draft.season.endDate, "2026-05-30");
  assert.equal(addDays("2026-03-01", 90), "2026-05-30");
});

test("대표 작물은 첫 화분의 첫 작물이다", () => {
  const { draft, recommendation } = build();
  assert.equal(draft.season.featuredCropId, recommendation.planters[0].crops[0].cropId);
});
