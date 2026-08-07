import assert from "node:assert/strict";
import test from "node:test";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GardenLayout } from "./garden-layout.ts";
import { getGardenLayoutRuleWarnings } from "./garden-layout-rules.ts";

const crops = [
  createCrop("tomato", "토마토", "가지과", 45, 5, 5),
  createCrop("potato", "감자", "가지과", 25, 3, 4),
  createCrop("lettuce", "상추", "국화과", 25, 4, 4),
];

test("작물 사이 거리가 필요한 포기 간격보다 좁으면 경고한다", () => {
  const season = createSeason("current", "2026-03-01", "2026-06-30");
  const layout = createLayout("current", 25, 4, [
    { cellIndex: 0, cropId: "tomato" },
    { cellIndex: 1, cropId: "tomato" },
    { cellIndex: 3, cropId: "lettuce" },
  ]);

  const warnings = getGardenLayoutRuleWarnings(layout, season, crops, [layout], [season]);
  const spacingWarnings = warnings.filter((warning) => warning.type === "spacing");

  assert.equal(spacingWarnings.length, 1);
  assert.match(spacingWarnings[0]?.message ?? "", /최소 45cm/);
  assert.deepEqual(
    spacingWarnings[0]?.targets.map((target) => target.cellIndex),
    [0, 1],
  );
});

test("시즌 기간과 권장 심는 시기가 겹치지 않으면 작물별로 한 번 경고한다", () => {
  const season = createSeason("current", "2026-06-01", "2026-08-31");
  const layout = createLayout("current", 50, 2, [
    { cellIndex: 0, cropId: "lettuce" },
    { cellIndex: 1, cropId: "lettuce" },
  ]);

  const warnings = getGardenLayoutRuleWarnings(layout, season, crops, [layout], [season]);
  const periodWarnings = warnings.filter((warning) => warning.type === "planting-period");

  assert.equal(periodWarnings.length, 1);
  assert.equal(periodWarnings[0]?.targets.length, 2);
  assert.match(periodWarnings[0]?.message ?? "", /4월 초~4월 말/);
});

test("시즌 기간 안에 권장 심는 달이 있으면 시기 경고를 만들지 않는다", () => {
  const season = createSeason("current", "2026-03-01", "2026-06-30");
  const layout = createLayout("current", 50, 2, [
    { cellIndex: 0, cropId: "tomato" },
  ]);

  const warnings = getGardenLayoutRuleWarnings(layout, season, crops, [layout], [season]);

  assert.equal(warnings.some((warning) => warning.type === "planting-period"), false);
});

test("가장 최근 이전 재배 시즌의 같은 구역에 같은 과 작물을 배치하면 경고한다", () => {
  const previousSeason = createSeason("previous", "2025-03-01", "2025-06-30", "지난 봄");
  const currentSeason = createSeason("current", "2026-03-01", "2026-06-30", "올봄");
  const previousLayout = createLayout("previous", 50, 2, [
    { cellIndex: 0, cropId: "potato" },
  ]);
  const currentLayout = createLayout("current", 25, 4, [
    { cellIndex: 1, cropId: "tomato" },
  ]);

  const warnings = getGardenLayoutRuleWarnings(
    currentLayout,
    currentSeason,
    crops,
    [previousLayout, currentLayout],
    [previousSeason, currentSeason],
  );
  const rotationWarnings = warnings.filter((warning) => warning.type === "crop-rotation");

  assert.equal(rotationWarnings.length, 1);
  assert.match(rotationWarnings[0]?.message ?? "", /지난 봄/);
  assert.deepEqual(
    rotationWarnings[0]?.targets.map((target) => target.seasonId),
    ["current", "previous"],
  );
});

test("이전 시즌과 구역이 겹치지 않거나 과가 다르면 연작 경고를 만들지 않는다", () => {
  const previousSeason = createSeason("previous", "2025-03-01", "2025-06-30");
  const currentSeason = createSeason("current", "2026-03-01", "2026-06-30");
  const previousLayout = createLayout("previous", 25, 4, [
    { cellIndex: 0, cropId: "potato" },
    { cellIndex: 1, cropId: "lettuce" },
  ]);
  const currentLayout = createLayout("current", 25, 4, [
    { cellIndex: 1, cropId: "tomato" },
    { cellIndex: 0, cropId: "lettuce" },
  ]);

  const warnings = getGardenLayoutRuleWarnings(
    currentLayout,
    currentSeason,
    crops,
    [previousLayout, currentLayout],
    [previousSeason, currentSeason],
  );

  assert.equal(warnings.some((warning) => warning.type === "crop-rotation"), false);
});

function createCrop(
  id: string,
  name: string,
  familyName: string,
  plantSpacingCm: number,
  startMonth: number,
  endMonth: number,
): CropReference {
  return {
    id,
    name,
    familyName,
    category: "fruit",
    difficulty: "normal",
    plantingMaterial: "seedling",
    supportedSpaces: ["garden"],
    plantingPeriod: { startMonth, endMonth, label: `${startMonth}월 초~${endMonth}월 말` },
    harvestPeriod: { startMonth: 6, endMonth: 8, label: "6월~8월" },
    plantSpacingCm,
    summary: `${name} 설명`,
    sourceId: "source",
  };
}

function createSeason(
  id: string,
  startDate: string,
  endDate: string,
  name = "봄 시즌",
): GrowingSeason {
  return {
    id,
    spaceId: "space-1",
    name,
    startDate,
    endDate,
    notes: "",
    createdAt: `${startDate}T00:00:00.000Z`,
  };
}

function createLayout(
  seasonId: string,
  cellSizeCm: 10 | 25 | 50 | 100,
  columns: number,
  placements: GardenLayout["placements"],
): GardenLayout {
  return {
    seasonId,
    spaceId: "space-1",
    spaceWidthCm: cellSizeCm * columns,
    spaceLengthCm: cellSizeCm * 2,
    cellSizeCm,
    columns,
    rows: 2,
    placements,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
