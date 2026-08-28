import assert from "node:assert/strict";
import test from "node:test";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import { getSeasonNextStep } from "./season-next-step.ts";

const emptyLayout: GardenLayout = {
  seasonId: "season-1",
  spaceId: "space-1",
  spaceWidthCm: 120,
  spaceLengthCm: 60,
  cellSizeCm: 10,
  columns: 12,
  rows: 6,
  placements: [],
  version: 1,
  updatedAt: "2026-08-13T00:00:00.000Z",
};

const season = {
  id: "season-1",
  featuredCropId: undefined,
};

test("새 텃밭 시즌은 작물 배치를 다음 단계로 안내한다", () => {
  const nextStep = getSeasonNextStep(season, "garden", undefined);

  assert.equal(nextStep.href, "/seasons/season-1/layout");
  assert.equal(nextStep.label, "작물 배치 시작하기");
});

test("빈 격자는 작물 배치를 이어서 하도록 안내한다", () => {
  const nextStep = getSeasonNextStep(season, "garden", emptyLayout);

  assert.equal(nextStep.href, "/seasons/season-1/layout");
  assert.equal(nextStep.label, "작물 배치 이어가기");
});

test("작물 배치가 있으면 재배 일정 생성을 안내한다", () => {
  const nextStep = getSeasonNextStep(season, "garden", {
    ...emptyLayout,
    placements: [{ cellIndex: 0, cropId: "lettuce" }],
  });

  assert.equal(nextStep.href, "/seasons/season-1/tasks");
  assert.equal(nextStep.label, "재배 일정 만들기");
});

test("화분·베란다 시즌은 화분 배치를 다음 단계로 안내한다", () => {
  const nextStep = getSeasonNextStep(season, "indoor", undefined);

  assert.equal(nextStep.href, "/seasons/season-1/placements");
  assert.equal(nextStep.label, "화분 배치하기");
});

test("화분·베란다 시즌에 작물을 이미 배치했으면 재배 일정 생성을 안내한다", () => {
  const nextStep = getSeasonNextStep(season, "indoor", undefined, true);

  assert.equal(nextStep.href, "/seasons/season-1/tasks");
  assert.equal(nextStep.label, "재배 일정 만들기");
});

test("화분·베란다 시즌에 대표 작물을 선택했으면 재배 일정 생성을 안내한다", () => {
  const nextStep = getSeasonNextStep({ ...season, featuredCropId: "lettuce" }, "indoor", undefined);

  assert.equal(nextStep.href, "/seasons/season-1/tasks");
  assert.equal(nextStep.label, "재배 일정 만들기");
});
