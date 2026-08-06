import assert from "node:assert/strict";
import test from "node:test";
import {
  createGardenLayout,
  InvalidCropPlacementError,
  isGardenLayoutOutdated,
  toggleCropPlacement,
} from "./garden-layout.ts";

function createValidLayout() {
  const result = createGardenLayout(
    "season-1",
    "space-1",
    100,
    50,
    25,
    "2026-08-06T00:00:00.000Z",
  );
  if (!result.valid) assert.fail(result.message);
  assert.equal(result.valid, true);
  return result.layout;
}

test("공간 크기와 칸 크기로 격자 행과 열을 계산한다", () => {
  const layout = createValidLayout();
  assert.equal(layout.columns, 4);
  assert.equal(layout.rows, 2);
  assert.deepEqual(layout.placements, []);
});

test("남는 길이는 버리고 공간 안쪽의 완전한 칸만 만든다", () => {
  const result = createGardenLayout(
    "season-1",
    "space-1",
    119,
    74,
    25,
    "2026-08-06T00:00:00.000Z",
  );
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.layout.columns, 4);
    assert.equal(result.layout.rows, 2);
  }
});

test("빈 연결, 잘못된 크기와 셀보다 작은 공간을 거부한다", () => {
  const missingRelation = createGardenLayout("", "", 100, 100, 25, "now");
  const invalidSize = createGardenLayout("season", "space", 0, 100, 25, "now");
  const tooSmall = createGardenLayout("season", "space", 20, 20, 25, "now");

  assert.equal(missingRelation.valid, false);
  assert.equal(invalidSize.valid, false);
  assert.equal(tooSmall.valid, false);
});

test("400칸을 넘는 격자 생성을 거부한다", () => {
  const result = createGardenLayout("season", "space", 210, 200, 10, "now");
  assert.equal(result.valid, false);
});

test("빈 칸에 작물을 배치하고 같은 작물을 다시 누르면 제거한다", () => {
  const layout = createValidLayout();
  const placed = toggleCropPlacement(layout, 7, "lettuce", ["lettuce"], "later");
  const removed = toggleCropPlacement(placed, 7, "lettuce", ["lettuce"], "latest");

  assert.deepEqual(placed.placements, [{ cellIndex: 7, cropId: "lettuce" }]);
  assert.deepEqual(removed.placements, []);
});

test("이미 채운 칸에 다른 작물을 선택하면 교체한다", () => {
  const layout = createValidLayout();
  const lettuce = toggleCropPlacement(layout, 0, "lettuce", ["lettuce", "carrot"], "later");
  const carrot = toggleCropPlacement(lettuce, 0, "carrot", ["lettuce", "carrot"], "latest");

  assert.deepEqual(carrot.placements, [{ cellIndex: 0, cropId: "carrot" }]);
});

test("범위 밖 칸과 등록되지 않은 작물 배치를 거부한다", () => {
  const layout = createValidLayout();
  assert.throws(
    () => toggleCropPlacement(layout, 8, "lettuce", ["lettuce"], "later"),
    InvalidCropPlacementError,
  );
  assert.throws(
    () => toggleCropPlacement(layout, 0, "missing", ["lettuce"], "later"),
    InvalidCropPlacementError,
  );
});

test("격자 생성 이후 연결 공간 크기가 바뀌었는지 확인한다", () => {
  const layout = createValidLayout();
  assert.equal(
    isGardenLayoutOutdated(layout, { id: "space-1", widthCm: 100, lengthCm: 50 }),
    false,
  );
  assert.equal(
    isGardenLayoutOutdated(layout, { id: "space-1", widthCm: 120, lengthCm: 50 }),
    true,
  );
});
