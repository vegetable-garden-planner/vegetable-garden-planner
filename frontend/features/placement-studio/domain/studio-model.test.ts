import assert from "node:assert/strict";
import test from "node:test";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import {
  distanceCm, firstFreeCell, gridColumns, gridRows, growthDensity, growthWidthCm,
  isCellTaken, occupancy, physicalCenter, planterCentre, planterSize,
  type StudioState,
} from "./studio-model.ts";
import {
  countValidations, recommendForCrop, spacingNeed, validateCandidate,
  validationMessage, type ValidationInput,
} from "./validation.ts";
import {
  fromLayout, readCellPosition, toContainerInputs, toLayoutPlacements, toStudioPlacements, toStudioPlanter,
} from "./studio-adapter.ts";
import {
  groupUnderPlanter, isDrawable, nextGroupName, pointInGroup, rectFromDrag, resizeRect,
  syncMembershipFromFrame, syncMembershipFromPlanter, MIN_GROUP_W,
} from "./planter-group.ts";

function space(over: Partial<GrowingSpace> = {}): GrowingSpace {
  return {
    id: "sp1", name: "햇살 채소 화분", type: "balcony", sunlight: "full",
    widthCm: 80, lengthCm: 30, depthCm: 25,
    address: "베란다 창가", latitude: null, longitude: null,
    orientation: null, shadeLevel: null, estimatedSunlightHours: null,
    notes: "", version: 3, createdAt: "", updatedAt: "", ...over,
  };
}

function crop(over: Partial<CropReference> = {}): CropReference {
  return {
    id: "lettuce", name: "상추", familyName: "국화과", category: "leaf", difficulty: "easy",
    plantingMaterial: "seedling", supportedSpaces: ["balcony", "indoor", "garden"],
    plantingPeriod: { startMonth: 4, endMonth: 5, label: "4~5월" },
    harvestPeriod: { startMonth: 5, endMonth: 6, label: "" },
    plantSpacingCm: 25, minPotDepthCm: 15, sunRequirement: "partial",
    needsSupport: false, summary: "", sourceId: "", ...over,
  };
}

const PLAN = { id: "se1", name: "봄 계획", month: 4, mode: "container" as const };
const planter = toStudioPlanter(space(), PLAN, { x: 170, y: 160 });

function stateWith(placements: StudioState["placements"] = []): StudioState {
  return { planters: [planter], placements, groups: [] };
}

function input(over: Partial<ValidationInput> = {}): ValidationInput {
  return {
    state: stateWith(),
    cropsById: new Map([["lettuce", crop()]]),
    ...over,
  };
}

/* ------------------------------------------------------------ 모델 */

test("격자는 실제 화분 크기에서 나온다", () => {
  assert.equal(gridColumns(80), 8);
  assert.equal(gridRows(30), 3);
  assert.equal(gridColumns(40), 4);
  assert.equal(gridRows(40), 4);
  assert.equal(gridColumns(100), 10);
  assert.equal(gridRows(20), 2);
  assert.equal(gridColumns(5), 2, "아주 작은 화분도 최소 2칸");
});

test("화면 크기는 실제 비율을 따르고 최소 크기를 지킨다", () => {
  assert.deepEqual(planterSize(planter), { w: 80 * 5.2, h: 30 * 5.2 });
  const tiny = toStudioPlanter(space({ id: "t", widthCm: 20, lengthCm: 20 }), PLAN, { x: 0, y: 0 });
  assert.deepEqual(planterSize(tiny), { w: 190, h: 125 });
});

test("칸 중심과 칸 사이 거리는 실제 cm 로 계산한다", () => {
  assert.deepEqual(physicalCenter(planter, 0, 0), { x: 5, y: 5 });
  assert.equal(distanceCm(planter, { col: 0, row: 0 }, { col: 1, row: 0 }), 10);
  assert.equal(distanceCm(planter, { col: 0, row: 0 }, { col: 0, row: 1 }), 10);
  assert.equal(planterCentre(planter).x, 170 + 208);
});

test("점유율과 예상 생육 공간은 실제 값으로 계산한다", () => {
  const state = stateWith([
    { id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 0, row: 0, plantedAt: null },
    { id: "b", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 1, row: 0, plantedAt: null },
  ]);
  assert.equal(occupancy(state, planter), 8);
  const cropsById = new Map([["lettuce", crop()]]);
  // 지름 25cm 원 두 개 / (80 × 30)
  assert.equal(growthDensity(state, planter, cropsById), Math.round(2 * Math.PI * 12.5 * 12.5 / 2400 * 100));
  assert.equal(growthWidthCm(crop({ plantSpacingCm: 45 })), 45);
});

test("빈 칸 찾기와 중복 칸 판정", () => {
  const state = stateWith([{ id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 0, row: 0, plantedAt: null }]);
  assert.equal(isCellTaken(state, planter.id, 0, 0), true);
  assert.equal(isCellTaken(state, planter.id, 0, 0, "a"), false, "자기 자신은 세지 않는다");
  assert.deepEqual(firstFreeCell(state, planter), { col: 1, row: 0 });
});

/* ------------------------------------------------------------ 검증 */

test("조건이 다 맞으면 적합이고 100점이다", () => {
  const v = validateCandidate(input(), "lettuce", planter, 0, 0)!;
  assert.equal(v.overall, "good");
  assert.equal(v.score, 100);
});

test("화분 깊이가 5cm 이내로 모자라면 주의, 더 모자라면 부적합", () => {
  const shallow = toStudioPlanter(space({ depthCm: 26 }), PLAN, { x: 0, y: 0 });
  const near = validateCandidate(input(), "lettuce", { ...shallow, d: 12 }, 0, 0)!;
  assert.equal(near.depth, "warning");
  const far = validateCandidate(input(), "lettuce", { ...shallow, d: 5 }, 0, 0)!;
  assert.equal(far.depth, "bad");
  assert.equal(far.overall, "bad");
});

test("햇빛은 한 단계 부족하면 주의, 두 단계면 부적합", () => {
  const cropsById = new Map([["tomato", crop({ id: "tomato", name: "토마토", sunRequirement: "full" })]]);
  const partial = validateCandidate(input({ cropsById }), "tomato", { ...planter, sun: "partial" }, 0, 0)!;
  assert.equal(partial.sun, "warning");
  const low = validateCandidate(input({ cropsById }), "tomato", { ...planter, sun: "low" }, 0, 0)!;
  assert.equal(low.sun, "bad");
});

test("기준 값이 없으면 판단하지 않고 확인으로 둔다", () => {
  const cropsById = new Map([["x", crop({ id: "x", minPotDepthCm: null, sunRequirement: null })]]);
  const bare = { ...planter, d: null, sun: "", seasonMonth: null };
  const v = validateCandidate(input({ cropsById }), "x", bare, 0, 0)!;
  assert.equal(v.depth, "info");
  assert.equal(v.sun, "info");
  assert.equal(v.season, "info");
  assert.equal(v.overall, "good");
});

test("이웃과 자란 뒤 겹치면 간격이 주의·부적합으로 내려간다", () => {
  const state = stateWith([{ id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 0, row: 0, plantedAt: null }]);
  const close = validateCandidate(input({ state }), "lettuce", planter, 1, 0)!;
  assert.equal(close.spacing, "bad");
  assert.equal(close.nearest, 10);
  assert.equal(close.need, 25);

  const mid = validateCandidate(input({ state }), "lettuce", planter, 2, 0)!;
  assert.equal(mid.spacing, "warning");

  const far = validateCandidate(input({ state }), "lettuce", planter, 3, 0)!;
  assert.equal(far.spacing, "good");
});

test("씨앗 파종 작물은 요구 간격이 완화된다", () => {
  assert.equal(spacingNeed(crop({ plantingMaterial: "seedling", plantSpacingCm: 25 })), 25);
  assert.ok(Math.abs(spacingNeed(crop({ plantingMaterial: "seed", plantSpacingCm: 25 })) - 13.75) < 1e-9);
  assert.equal(spacingNeed(crop({ plantingMaterial: "seed", plantSpacingCm: 5 })), 5, "최소 5cm");
});

test("심는 시기는 그 화분이 속한 계획의 시작 월로 본다", () => {
  // 계절 판정 기준은 화분마다 다르다. 한 캔버스에 여러 계획의 화분이 놓이기 때문이다.
  const june = { ...planter, seasonMonth: 6 };
  assert.equal(validateCandidate(input(), "lettuce", planter, 0, 0)!.season, "good");
  assert.equal(validateCandidate(input(), "lettuce", june, 0, 0)!.season, "warning");

  const winter = new Map([["w", crop({ id: "w", plantingPeriod: { startMonth: 11, endMonth: 2, label: "" } })]]);
  const december = { ...planter, seasonMonth: 12 };
  assert.equal(validateCandidate(input({ cropsById: winter }), "w", december, 0, 0)!.season, "good");
  assert.equal(validateCandidate(input({ cropsById: winter }), "w", june, 0, 0)!.season, "warning");
});

test("검증 문장은 실제 수치만 담는다", () => {
  const state = stateWith([{ id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 0, row: 0, plantedAt: null }]);
  const v = validateCandidate(input({ state }), "lettuce", planter, 1, 0)!;
  const message = validationMessage(v, crop(), planter);
  assert.match(message, /약 10cm로 권장 간격 25cm/);
  assert.match(validationMessage(validateCandidate(input(), "lettuce", planter, 0, 0)!, crop(), planter), /잘 맞습니다/);
});

test("전체 배치 요약은 실제 배치를 센다", () => {
  const state = stateWith([
    { id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 0, row: 0, plantedAt: null },
    { id: "b", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 1, row: 0, plantedAt: null },
    { id: "c", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 5, row: 2, plantedAt: null },
  ]);
  const counts = countValidations(input({ state }));
  assert.equal(counts.good + counts.warning + counts.bad, 3);
  assert.equal(counts.bad, 2, "10cm 로 붙은 두 포기가 부적합");
});

/* ------------------------------------------------------------ 추천 */

test("추천 위치는 다른 화분까지 비교하고 순위를 매긴다", () => {
  const second = toStudioPlanter(space({ id: "sp2", name: "깊은 화분", depthCm: 40, widthCm: 40, lengthCm: 40 }), PLAN, { x: 700, y: 200 });
  const state: StudioState = {
    planters: [{ ...planter, d: 5 }, second],
    placements: [],
    groups: [],
  };
  const cropsById = new Map([["tomato", crop({ id: "tomato", name: "토마토", minPotDepthCm: 30, plantSpacingCm: 45 })]]);
  const cells = recommendForCrop(input({ state, cropsById }), "tomato", undefined, 5);

  assert.equal(cells[0].rank, 1);
  assert.equal(cells[0].planterId, second.id, "깊이가 맞는 화분이 1순위");
  assert.ok(cells.every((cell, index) => cell.rank === index + 1));
  assert.ok(cells[0].score >= cells[cells.length - 1].score);
});

test("이미 찬 칸은 추천하지 않고, 옮기는 작물 자신은 비켜 준다", () => {
  const state = stateWith([
    { id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 0, row: 0, plantedAt: null },
    { id: "b", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 7, row: 2, plantedAt: null },
  ]);
  const cells = recommendForCrop(input({ state }), "lettuce", "a", 30);
  assert.ok(cells.every((cell) => !(cell.col === 7 && cell.row === 2)), "찬 칸 제외");
  assert.ok(cells.some((cell) => cell.col === 0 && cell.row === 0), "자기 자리는 후보로 남는다");
});

/* ------------------------------------------------------------ 저장 형식 */

test("작물 위치는 position 에 col/row 로 저장된다", () => {
  const state = stateWith([{ id: "a", cropId: "lettuce", planterId: planter.id, seasonId: "se1", col: 3, row: 1, plantedAt: "2026-03-18" }]);
  assert.deepEqual(toContainerInputs(state, "se1"), [{
    spaceId: "sp1", cropId: "lettuce", quantity: 1,
    position: { col: 3, row: 1, cols: 8, rows: 3, plantedAt: "2026-03-18" },
  }]);
});

test("저장된 col/row 를 그대로 읽고, 없으면 수량만큼 빈 칸을 채운다", () => {
  const exact = toStudioPlacements([
    { id: "p1", seasonId: "se1", spaceId: "sp1", cropId: "lettuce", quantity: 1, position: { col: 2, row: 1, cols: 8, rows: 3, plantedAt: "2026-03-18" } },
  ], [planter]);
  assert.deepEqual(exact.placements.map((p) => [p.col, p.row, p.plantedAt]), [[2, 1, "2026-03-18"]]);

  const legacy = toStudioPlacements([
    { id: "p1", seasonId: "se1", spaceId: "sp1", cropId: "lettuce", quantity: 3, position: { order: 0 } },
  ], [planter]);
  assert.equal(legacy.placements.length, 3);
  assert.deepEqual(legacy.placements.map((p) => p.col), [0, 1, 2]);
  assert.deepEqual(legacy.unplaced, []);
});

test("칸이 모자라면 조용히 버리지 않고 알린다", () => {
  const tiny = toStudioPlanter(space({ id: "t", widthCm: 20, lengthCm: 20 }), PLAN, { x: 0, y: 0 });
  const result = toStudioPlacements([
    { id: "p1", seasonId: "se1", spaceId: "t", cropId: "lettuce", quantity: 9, position: null },
  ], [tiny]);
  assert.equal(result.placements.length, 4);
  assert.deepEqual(result.unplaced, [{ cropId: "lettuce", count: 5 }]);
});

test("readCellPosition 은 col/row 가 아닌 값을 받지 않는다", () => {
  assert.equal(readCellPosition(null), null);
  assert.equal(readCellPosition({ order: 2 }), null);
  assert.equal(readCellPosition({ col: -1, row: 0 }), null);
  assert.equal(readCellPosition({ col: 1.5, row: 0 }), null);
});

test("텃밭 격자는 cellIndex 와 col/row 를 오간다", () => {
  const layout = {
    seasonId: "se1", spaceId: "sp1", spaceWidthCm: 80, spaceLengthCm: 30,
    cellSizeCm: 10 as const, columns: 8, rows: 3,
    placements: [{ cellIndex: 9, cropId: "lettuce" }], version: 2, updatedAt: "",
  };
  const placements = fromLayout(layout, planter);
  assert.deepEqual(placements.map((p) => [p.col, p.row]), [[1, 1]]);
  assert.deepEqual(toLayoutPlacements({ ...stateWith(placements) }, planter, 8), [{ cellIndex: 9, cropId: "lettuce" }]);
});

/* ------------------------------------------------------------ 그룹 */

test("어느 방향으로 끌어도 같은 프레임이 나온다", () => {
  assert.deepEqual(rectFromDrag({ x: 10, y: 20 }, { x: 210, y: 140 }), { x: 10, y: 20, w: 200, h: 120 });
  assert.deepEqual(rectFromDrag({ x: 210, y: 140 }, { x: 10, y: 20 }), { x: 10, y: 20, w: 200, h: 120 });
  assert.equal(isDrawable({ x: 0, y: 0, w: 20, h: 20 }), false);
  assert.equal(isDrawable({ x: 0, y: 0, w: 200, h: 120 }), true);
});

test("8방향 손잡이는 프레임만 바꾼다", () => {
  const base = { x: 100, y: 100, w: 300, h: 200 };
  assert.deepEqual(resizeRect(base, "e", 50, 0), { x: 100, y: 100, w: 350, h: 200 });
  assert.deepEqual(resizeRect(base, "w", -50, 0), { x: 50, y: 100, w: 350, h: 200 });
  assert.deepEqual(resizeRect(base, "n", 0, 40), { x: 100, y: 140, w: 300, h: 160 });
  assert.deepEqual(resizeRect(base, "se", 20, 20), { x: 100, y: 100, w: 320, h: 220 });
  assert.equal(resizeRect(base, "e", -1000, 0).w, MIN_GROUP_W);
  assert.deepEqual(base, { x: 100, y: 100, w: 300, h: 200 }, "원본 불변");
});

test("화분 중심이 프레임 안이면 자동 포함, 밖이면 자동 제외", () => {
  const centre = planterCentre(planter);
  const state: StudioState = {
    planters: [planter],
    placements: [],
    groups: [{ id: "g1", name: "베란다 채소존", x: centre.x - 50, y: centre.y - 50, w: 100, h: 100, planterIds: [] }],
  };
  syncMembershipFromFrame(state, "g1");
  assert.deepEqual(state.groups[0].planterIds, [planter.id]);

  state.groups[0].x = centre.x + 400;
  syncMembershipFromFrame(state, "g1");
  assert.deepEqual(state.groups[0].planterIds, []);
});

test("화분을 옮기면 소속이 다시 계산되고 다른 그룹에서 빠진다", () => {
  const centre = planterCentre(planter);
  const state: StudioState = {
    planters: [planter],
    placements: [],
    groups: [
      { id: "g1", name: "A", x: centre.x - 50, y: centre.y - 50, w: 100, h: 100, planterIds: [planter.id] },
      { id: "g2", name: "B", x: centre.x - 20, y: centre.y - 20, w: 100, h: 100, planterIds: [] },
    ],
  };
  syncMembershipFromPlanter(state, planter.id);
  assert.deepEqual(state.groups[0].planterIds, [], "겹치면 나중 그룹이 이긴다");
  assert.deepEqual(state.groups[1].planterIds, [planter.id]);

  assert.equal(pointInGroup(centre.x, centre.y, state.groups[1]), true);
  assert.equal(groupUnderPlanter(state, planter, 0, 0)?.id, "g2");
  assert.equal(groupUnderPlanter(state, planter, 900, 0), null);
});

test("그룹 이름 기본값은 겹치지 않는다", () => {
  assert.equal(nextGroupName([]), "새 그룹 1");
  assert.equal(nextGroupName([{ id: "g", name: "새 그룹 1", x: 0, y: 0, w: 1, h: 1, planterIds: [] }]), "새 그룹 2");
});
