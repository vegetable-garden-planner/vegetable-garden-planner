import assert from "node:assert/strict";
import test from "node:test";
import {
  computeContainerGrid,
  fillGridCells,
  isCellOccupied,
  isCellWithinGrid,
  recommendCellsForCrop,
  validateCellPlacement,
  type GridCropSpacing,
  type GridSpace,
} from "./container-placement-grid.ts";

test("화분 크기를 10cm 칸으로 나눈다", () => {
  assert.deepEqual(computeContainerGrid({ widthCm: 80, lengthCm: 30 }), { columns: 8, rows: 3, cellSizeCm: 10 });
  assert.deepEqual(computeContainerGrid({ widthCm: 40, lengthCm: 40 }), { columns: 4, rows: 4, cellSizeCm: 10 });
  assert.deepEqual(computeContainerGrid({ widthCm: 100, lengthCm: 20 }), { columns: 10, rows: 2, cellSizeCm: 10 });
});

test("나머지가 있어도 칸은 최소 1개다", () => {
  assert.deepEqual(computeContainerGrid({ widthCm: 5, lengthCm: 5 }), { columns: 1, rows: 1, cellSizeCm: 10 });
});

test("격자 범위 안/밖을 판단한다", () => {
  const grid = computeContainerGrid({ widthCm: 40, lengthCm: 40 });
  assert.equal(isCellWithinGrid({ col: 0, row: 0 }, grid), true);
  assert.equal(isCellWithinGrid({ col: 3, row: 3 }, grid), true);
  assert.equal(isCellWithinGrid({ col: 4, row: 0 }, grid), false);
  assert.equal(isCellWithinGrid({ col: -1, row: 0 }, grid), false);
});

test("이미 채워진 칸을 판단한다", () => {
  const placements = [{ col: 1, row: 1, cropId: "lettuce" }];
  assert.equal(isCellOccupied({ col: 1, row: 1 }, placements), true);
  assert.equal(isCellOccupied({ col: 1, row: 2 }, placements), false);
  assert.equal(isCellOccupied({ col: 1, row: 1 }, placements, "lettuce"), false);
});

test("기존 칸을 유지하면서 부족한 만큼만 빈 칸을 앞에서부터 채운다", () => {
  const grid = computeContainerGrid({ widthCm: 40, lengthCm: 20 });
  const filled = fillGridCells(3, grid, [{ col: 2, row: 1 }]);
  assert.equal(filled.length, 3);
  assert.deepEqual(filled[0], { col: 2, row: 1 });
  assert.deepEqual(filled[1], { col: 0, row: 0 });
  assert.deepEqual(filled[2], { col: 1, row: 0 });
});

test("격자를 벗어난 기존 칸은 버리고 새로 채운다", () => {
  const grid = computeContainerGrid({ widthCm: 20, lengthCm: 10 });
  const filled = fillGridCells(2, grid, [{ col: 9, row: 9 }]);
  assert.equal(filled.length, 2);
  assert.deepEqual(filled, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
});

test("수량이 줄면 뒤쪽 칸부터 뺀다", () => {
  const grid = computeContainerGrid({ widthCm: 40, lengthCm: 10 });
  const filled = fillGridCells(1, grid, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
  assert.deepEqual(filled, [{ col: 0, row: 0 }]);
});

test("다른 작물이 이미 차지한 칸은 건너뛴다", () => {
  const grid = computeContainerGrid({ widthCm: 30, lengthCm: 10 });
  const occupiedByOthers = [{ col: 0, row: 0 }, { col: 1, row: 0 }];
  const filled = fillGridCells(1, grid, [], occupiedByOthers);
  assert.deepEqual(filled, [{ col: 2, row: 0 }]);
});

test("지정한 칸이 다른 작물 자리면 건너뛰고 그 다음 빈 칸을 쓴다", () => {
  const grid = computeContainerGrid({ widthCm: 30, lengthCm: 10 });
  const occupiedByOthers = [{ col: 0, row: 0 }];
  const filled = fillGridCells(1, grid, [{ col: 0, row: 0 }], occupiedByOthers);
  assert.deepEqual(filled, [{ col: 1, row: 0 }]);
});

const lettuce: GridCropSpacing = { id: "lettuce", plantSpacingCm: 25, minPotDepthCm: 15, sunRequirement: "partial" };
const tomato: GridCropSpacing = { id: "tomato", plantSpacingCm: 45, minPotDepthCm: 30, sunRequirement: "full" };

test("화분 깊이가 부족하면 depth가 bad다", () => {
  const shallow: GridSpace = { widthCm: 40, lengthCm: 40, depthCm: 10, sunlight: "full" };
  const v = validateCellPlacement({ col: 0, row: 0 }, tomato, shallow, computeContainerGrid(shallow), []);
  assert.equal(v.depth, "bad");
  assert.equal(v.overall, "bad");
});

test("햇빛이 한 단계 부족하면 warning, 두 단계 부족하면 bad다", () => {
  const partial: GridSpace = { widthCm: 40, lengthCm: 40, depthCm: 30, sunlight: "partial" };
  const low: GridSpace = { widthCm: 40, lengthCm: 40, depthCm: 30, sunlight: "low" };
  assert.equal(validateCellPlacement({ col: 0, row: 0 }, tomato, partial, computeContainerGrid(partial), []).sun, "warning");
  assert.equal(validateCellPlacement({ col: 0, row: 0 }, tomato, low, computeContainerGrid(low), []).sun, "bad");
});

test("화분·햇빛 정보를 모르면 unknown이지 good이 아니다", () => {
  const unknownSpace: GridSpace = { widthCm: 40, lengthCm: 40, depthCm: null, sunlight: null };
  const v = validateCellPlacement({ col: 0, row: 0 }, tomato, unknownSpace, computeContainerGrid(unknownSpace), []);
  assert.equal(v.depth, "unknown");
  assert.equal(v.sun, "unknown");
});

test("이웃과 권장 간격보다 가까우면 spacing이 나빠진다", () => {
  const space: GridSpace = { widthCm: 100, lengthCm: 10, depthCm: 30, sunlight: "full" };
  const grid = computeContainerGrid(space);
  const neighbor = [{ col: 0, row: 0, cropId: "tomato" }];
  // 10cm 떨어짐 < 필요 간격(45cm)*0.7 → bad
  assert.equal(validateCellPlacement({ col: 1, row: 0 }, tomato, space, grid, neighbor).spacing, "bad");
  // 40cm 떨어짐 >= 45*0.7=31.5, < 45 → warning
  assert.equal(validateCellPlacement({ col: 4, row: 0 }, tomato, space, grid, neighbor).spacing, "warning");
  // 50cm 떨어짐 >= 45 → good
  assert.equal(validateCellPlacement({ col: 5, row: 0 }, tomato, space, grid, neighbor).spacing, "good");
});

test("주변에 아무것도 없으면 spacing은 good이다", () => {
  const space: GridSpace = { widthCm: 40, lengthCm: 40, depthCm: 30, sunlight: "full" };
  const v = validateCellPlacement({ col: 0, row: 0 }, lettuce, space, computeContainerGrid(space), []);
  assert.equal(v.spacing, "good");
});

test("추천 칸은 점수가 높은 순으로 정렬되고 채워진 칸은 빠진다", () => {
  const space: GridSpace = { widthCm: 30, lengthCm: 10, depthCm: 30, sunlight: "full" };
  const grid = computeContainerGrid(space);
  const occupied = [{ col: 0, row: 0, cropId: "tomato" }];
  const results = recommendCellsForCrop(tomato, space, grid, occupied);

  assert.equal(results.some((r) => r.cell.col === 0 && r.cell.row === 0), false);
  for (let i = 1; i < results.length; i += 1) {
    assert.ok(results[i - 1].score >= results[i].score);
  }
});
