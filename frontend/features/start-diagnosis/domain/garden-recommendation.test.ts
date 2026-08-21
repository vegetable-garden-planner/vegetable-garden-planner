import assert from "node:assert/strict";
import test from "node:test";
import { createGardenRecommendation } from "./garden-recommendation.ts";

const basePlanter = {
  widthCm: 60,
  heightCm: 25,
  depthCm: 20,
  count: 2,
};

test("같은 화분과 햇빛이면 관심 작물이 달라도 추천 결과가 같다", () => {
  const first = createGardenRecommendation({
    planter: basePlanter,
    sunlight: { duration: "3-5h", location: "window" },
    preferences: { selectedCrops: ["lettuce"] },
  } as Parameters<typeof createGardenRecommendation>[0] & { preferences: unknown });
  const second = createGardenRecommendation({
    planter: basePlanter,
    sunlight: { duration: "3-5h", location: "window" },
    preferences: { selectedCrops: ["strawberry", "chili"] },
  } as Parameters<typeof createGardenRecommendation>[0] & { preferences: unknown });

  assert.deepEqual(first, second);
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
  assert.equal([...lowCropIds].every((cropId) => ["lettuce", "spinach", "basil"].includes(cropId)), true);
  assert.equal(sunnyCropIds.has("cherry-tomato") || sunnyCropIds.has("chili"), true);
});

test("실내는 잎채소를, 베란다의 충분한 빛은 열매 작물을 우선한다", () => {
  const indoor = createGardenRecommendation({
    planter: { ...basePlanter, count: 1 },
    sunlight: { duration: "6h+", location: "indoor" },
  });
  const balcony = createGardenRecommendation({
    planter: { ...basePlanter, count: 1 },
    sunlight: { duration: "6h+", location: "balcony" },
  });

  assert.equal(indoor.planters[0].crops.some((crop) => ["lettuce", "spinach"].includes(crop.cropId)), true);
  assert.equal(balcony.planters[0].crops.some((crop) => ["cherry-tomato", "chili"].includes(crop.cropId)), true);
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

  assert.equal(cropIds.some((cropId) => ["cherry-tomato", "chili", "strawberry"].includes(cropId)), false);
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
  assert.ok(result.planters.some((planter, index) => (
    index > 0 && planter.crops.map((crop) => crop.cropId).join("|")
      !== result.planters[0].crops.map((crop) => crop.cropId).join("|")
  )));
});
