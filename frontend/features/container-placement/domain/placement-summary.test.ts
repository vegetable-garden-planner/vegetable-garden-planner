import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlacementSummary,
  type SummaryCrop,
  type SummaryPlacement,
  type SummarySpace,
} from "./placement-summary.ts";

const LETTUCE: SummaryCrop = {
  id: "lettuce",
  name: "상추",
  plantSpacingCm: 10,
  minPotDepthCm: 15,
  sunRequirement: "partial",
};

const TOMATO: SummaryCrop = {
  id: "tomato",
  name: "토마토",
  plantSpacingCm: 45,
  minPotDepthCm: 30,
  sunRequirement: "full",
};

const BALCONY: SummarySpace = {
  id: "space-balcony",
  name: "남향 베란다",
  type: "balcony",
  widthCm: 60,
  lengthCm: 25,
  depthCm: 20,
  sunlight: "partial",
};

test("화분마다 배치된 채소만 묶고, 배치가 없는 화분은 뺀다", () => {
  const empty: SummarySpace = { ...BALCONY, id: "space-empty", name: "빈 화분" };
  const placements: SummaryPlacement[] = [
    { spaceId: BALCONY.id, cropId: LETTUCE.id, quantity: 4 },
  ];

  const summary = buildPlacementSummary(placements, [BALCONY, empty], [LETTUCE]);

  assert.equal(summary.containerCount, 1);
  assert.equal(summary.containers[0].space.id, BALCONY.id);
});

test("화분 개수·작물 종류 수·총 모종 수를 실제 배치에서 집계한다", () => {
  const secondSpace: SummarySpace = { ...BALCONY, id: "space-2" };
  const placements: SummaryPlacement[] = [
    { spaceId: BALCONY.id, cropId: LETTUCE.id, quantity: 4 },
    { spaceId: BALCONY.id, cropId: TOMATO.id, quantity: 2 },
    { spaceId: secondSpace.id, cropId: LETTUCE.id, quantity: 3 },
  ];

  const summary = buildPlacementSummary(placements, [BALCONY, secondSpace], [LETTUCE, TOMATO]);

  assert.equal(summary.containerCount, 2);
  assert.equal(summary.cropTypeCount, 2);
  assert.equal(summary.totalQuantity, 9);
});

test("화분 부피(가로×세로×깊이)로 필요한 흙을 리터로 계산한다", () => {
  const placements: SummaryPlacement[] = [
    { spaceId: BALCONY.id, cropId: LETTUCE.id, quantity: 4 },
  ];

  const summary = buildPlacementSummary(placements, [BALCONY], [LETTUCE]);

  assert.equal(summary.containers[0].soilLiters, (60 * 25 * 20) / 1000);
  assert.equal(summary.totalSoilLiters, (60 * 25 * 20) / 1000);
});

test("화분 깊이를 모르면 그 화분의 흙 양은 null이고 합계에서는 0으로 친다", () => {
  const unknownDepth: SummarySpace = { ...BALCONY, depthCm: null };
  const placements: SummaryPlacement[] = [
    { spaceId: unknownDepth.id, cropId: LETTUCE.id, quantity: 4 },
  ];

  const summary = buildPlacementSummary(placements, [unknownDepth], [LETTUCE]);

  assert.equal(summary.containers[0].soilLiters, null);
  assert.equal(summary.totalSoilLiters, 0);
});

test("화분 깊이·햇빛을 모르면 적합도는 unknown이다", () => {
  const noSunInfo: SummarySpace = { ...BALCONY, sunlight: null, depthCm: null };
  const placements: SummaryPlacement[] = [
    { spaceId: noSunInfo.id, cropId: LETTUCE.id, quantity: 4 },
  ];

  const summary = buildPlacementSummary(placements, [noSunInfo], [LETTUCE]);

  assert.equal(summary.containers[0].sunlightFit, "unknown");
  assert.equal(summary.containers[0].depthFit, "unknown");
});

test("햇빛이 부족한 화분에 배치하면 insufficient, 충분하면 sufficient다", () => {
  const shadySpace: SummarySpace = { ...BALCONY, sunlight: "low" };
  const placements: SummaryPlacement[] = [
    { spaceId: shadySpace.id, cropId: TOMATO.id, quantity: 1 }, // 토마토는 full 필요
  ];

  const shadySummary = buildPlacementSummary(placements, [shadySpace], [TOMATO]);
  assert.equal(shadySummary.containers[0].sunlightFit, "insufficient");

  const sunnySpace: SummarySpace = { ...BALCONY, sunlight: "full" };
  const sunnySummary = buildPlacementSummary(
    [{ spaceId: sunnySpace.id, cropId: TOMATO.id, quantity: 1 }],
    [sunnySpace],
    [TOMATO],
  );
  assert.equal(sunnySummary.containers[0].sunlightFit, "sufficient");
});

test("화분이 작물에 필요한 깊이보다 얕으면 insufficient다", () => {
  const shallowSpace: SummarySpace = { ...BALCONY, depthCm: 20 };
  const placements: SummaryPlacement[] = [
    { spaceId: shallowSpace.id, cropId: TOMATO.id, quantity: 1 }, // 토마토는 30cm 필요
  ];

  const summary = buildPlacementSummary(placements, [shallowSpace], [TOMATO]);

  assert.equal(summary.containers[0].depthFit, "insufficient");
});

test("카탈로그에 없는 작물 id는 표시용 기본값으로 대신한다", () => {
  const placements: SummaryPlacement[] = [
    { spaceId: BALCONY.id, cropId: "ghost-crop", quantity: 1 },
  ];

  const summary = buildPlacementSummary(placements, [BALCONY], [LETTUCE]);

  assert.equal(summary.containers[0].items[0].cropName, "알 수 없는 작물");
  assert.equal(summary.containers[0].items[0].plantSpacingCm, 0);
});
