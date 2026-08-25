import assert from "node:assert/strict";
import test from "node:test";
import {
  toEditableRows,
  toPlacementInputs,
  validatePlacementRows,
  type ContainerPlacement,
} from "./container-placement.ts";

test("배치를 position.order 기준으로 정렬해 편집 행으로 바꾼다", () => {
  const placements: ContainerPlacement[] = [
    { id: "b", spaceId: "space-2", cropId: "carrot", quantity: 2, position: { order: 1 } },
    { id: "a", spaceId: "space-1", cropId: "lettuce", quantity: 3, position: { order: 0 } },
  ];

  const rows = toEditableRows(placements);

  assert.deepEqual(rows.map((row) => row.cropId), ["lettuce", "carrot"]);
});

test("순서 정보가 없는 배치는 뒤로 보낸다", () => {
  const placements: ContainerPlacement[] = [
    { id: "a", spaceId: "space-1", cropId: "lettuce", quantity: 1, position: null },
    { id: "b", spaceId: "space-1", cropId: "carrot", quantity: 1, position: { order: 0 } },
  ];

  const rows = toEditableRows(placements);

  assert.deepEqual(rows.map((row) => row.cropId), ["carrot", "lettuce"]);
});

test("행 순서를 position.order로 그대로 저장한다", () => {
  const inputs = toPlacementInputs([
    { key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 1 },
    { key: "2", spaceId: "space-1", cropId: "carrot", quantity: 2 },
  ]);

  assert.deepEqual(inputs, [
    { spaceId: "space-1", cropId: "lettuce", quantity: 1, position: { order: 0 } },
    { spaceId: "space-1", cropId: "carrot", quantity: 2, position: { order: 1 } },
  ]);
});

test("화분·작물이 비었거나 수량이 범위를 벗어나면 거부한다", () => {
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "", cropId: "lettuce", quantity: 1 }]),
    "각 항목에 화분을 선택해 주세요.",
  );
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "", quantity: 1 }]),
    "각 항목에 작물을 선택해 주세요.",
  );
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 0 }]),
    "수량은 1~500 사이로 입력해 주세요.",
  );
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 501 }]),
    "수량은 1~500 사이로 입력해 주세요.",
  );
});

test("빈 목록과 정상 행은 통과한다", () => {
  assert.equal(validatePlacementRows([]), "");
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 3 }]),
    "",
  );
});
