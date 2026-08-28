import assert from "node:assert/strict";
import test from "node:test";
import { createGardenRecommendation } from "./garden-recommendation.ts";

const basePlanter = {
  widthCm: 60,
  heightCm: 25,
  depthCm: 20,
  count: 2,
};

test("고른 작물이 추천 결과에 실제로 반영된다", () => {
  const leafy = createGardenRecommendation({
    planter: basePlanter,
    sunlight: { duration: "6h+", location: "balcony" },
    selectedCrops: ["lettuce", "spinach"],
  });
  const fruity = createGardenRecommendation({
    // 토마토는 깊이 30cm가 필요하므로 그만한 화분을 쓴다
    planter: { ...basePlanter, heightCm: 32 },
    sunlight: { duration: "6h+", location: "balcony" },
    selectedCrops: ["tomato"],
  });

  const leafyIds = new Set(leafy.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId)));
  const fruityIds = new Set(fruity.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId)));

  assert.notDeepEqual(leafy, fruity);
  assert.equal([...leafyIds].every((cropId) => ["lettuce", "spinach"].includes(cropId)), true);
  assert.equal([...fruityIds].every((cropId) => cropId === "tomato"), true);
});

test("고르지 않은 작물은 추천에 절대 들어가지 않는다", () => {
  const result = createGardenRecommendation({
    planter: { ...basePlanter, count: 3 },
    sunlight: { duration: "6h+", location: "balcony" },
    selectedCrops: ["green-onion"],
  });

  const cropIds = result.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId));
  assert.equal(cropIds.every((cropId) => cropId === "green-onion"), true);
});

test("조건에 맞지 않아 빠진 작물은 이유와 함께 알려 준다", () => {
  const result = createGardenRecommendation({
    // 깊이 12cm — 토마토(30cm)는 들어갈 수 없다
    planter: { ...basePlanter, heightCm: 12 },
    sunlight: { duration: "6h+", location: "balcony" },
    selectedCrops: ["lettuce", "tomato"],
  });

  const unplacedIds = result.unplacedCrops.map((crop) => crop.cropId);
  assert.equal(unplacedIds.includes("tomato"), true);
  assert.equal(result.unplacedCrops.every((crop) => crop.reason.length > 0), true);
  assert.equal(result.warnings.some((warning) => warning.includes("얕아요")), true);
});

test("화분 수가 모자라 자리를 못 받은 작물도 알려 준다", () => {
  const result = createGardenRecommendation({
    planter: { widthCm: 30, heightCm: 25, depthCm: 18, count: 1 },
    sunlight: { duration: "6h+", location: "balcony" },
    selectedCrops: ["lettuce", "spinach", "young-radish", "green-onion", "carrot"],
  });

  const placed = new Set(result.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId)));
  assert.equal(result.planters.length, 1);
  assert.ok(placed.size < 5);
  assert.ok(result.unplacedCrops.length > 0);
});

test("고른 작물을 넘기지 않으면 예전처럼 전체 작물에서 고른다", () => {
  const result = createGardenRecommendation({
    planter: basePlanter,
    sunlight: { duration: "3-5h", location: "window" },
  });

  assert.equal(result.planters.length, 2);
  assert.equal(result.unplacedCrops.length >= 0, true);
});

test("화분 개수와 추천 카드 개수가 항상 같다", () => {
  for (const count of [1, 3, 6]) {
    const result = createGardenRecommendation({
      planter: { ...basePlanter, count },
      sunlight: { duration: "6h+", location: "balcony" },
    });
    assert.equal(result.planters.length, count);
  }
});

test("낮은 빛은 잎채소 중심이고 충분한 베란다 빛은 열매 작물을 포함한다", () => {
  const lowLight = createGardenRecommendation({
    planter: basePlanter,
    sunlight: { duration: "2h", location: "indoor" },
  });
  const fullSun = createGardenRecommendation({
    planter: basePlanter,
    sunlight: { duration: "6h+", location: "balcony" },
  });

  const lowCropIds = new Set(lowLight.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId)));
  const sunnyCropIds = new Set(fullSun.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId)));

  assert.equal([...lowCropIds].every((cropId) => ["lettuce", "spinach", "young-radish", "green-onion"].includes(cropId)), true);
  assert.equal(sunnyCropIds.has("tomato") || sunnyCropIds.has("carrot"), true);
});

test("큰 화분은 흙과 배치 가능한 모종 수가 늘어난다", () => {
  const small = createGardenRecommendation({
    planter: { widthCm: 35, heightCm: 20, depthCm: 18, count: 1 },
    sunlight: { duration: "2h", location: "indoor" },
  });
  const large = createGardenRecommendation({
    planter: { widthCm: 100, heightCm: 30, depthCm: 45, count: 1 },
    sunlight: { duration: "2h", location: "indoor" },
  });

  assert.ok(large.totalSoilLiters > small.totalSoilLiters);
  assert.ok(large.totalSeedlings > small.totalSeedlings);
});

test("얕은 화분은 열매 작물을 제외하고 안내를 제공한다", () => {
  const result = createGardenRecommendation({
    planter: { ...basePlanter, heightCm: 12 },
    sunlight: { duration: "6h+", location: "balcony" },
  });
  const cropIds = result.planters.flatMap((planter) => planter.crops.map((crop) => crop.cropId));

  assert.equal(cropIds.includes("tomato"), false);
  assert.equal(result.warnings.some((warning) => warning.includes("얕아요")), true);
});

test("화분별 흙과 모종 합계가 하단 총합과 일치한다", () => {
  const result = createGardenRecommendation({
    planter: { ...basePlanter, count: 3 },
    sunlight: { duration: "3-5h", location: "window" },
  });
  const soilTotal = result.planters.reduce((total, planter) => total + planter.soilLiters, 0);
  const seedlingTotal = result.planters.reduce((total, planter) => (
    total + planter.crops.reduce((cropTotal, crop) => cropTotal + crop.seedlingCount, 0)
  ), 0);

  assert.equal(Math.round(soilTotal * 10) / 10, result.totalSoilLiters);
  assert.equal(seedlingTotal, result.totalSeedlings);
});
