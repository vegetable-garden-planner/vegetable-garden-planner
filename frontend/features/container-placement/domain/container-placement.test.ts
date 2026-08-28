import assert from "node:assert/strict";
import test from "node:test";
import {
  autoPlaceRows,
  canPlaceCropInSpace,
  isPlacedRow,
  toEditableRows,
  toPlacementInputs,
  validatePlacementRows,
  type ContainerPlacement,
  type ContainerPlacementRow,
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
    { key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 1, cells: [] },
    { key: "2", spaceId: "space-1", cropId: "carrot", quantity: 2, cells: [] },
  ]);

  assert.deepEqual(inputs, [
    { spaceId: "space-1", cropId: "lettuce", quantity: 1, position: { order: 0, cells: [] } },
    { spaceId: "space-1", cropId: "carrot", quantity: 2, position: { order: 1, cells: [] } },
  ]);
});

test("화분·작물이 비었거나 수량이 범위를 벗어나면 거부한다", () => {
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "", cropId: "lettuce", quantity: 1, cells: [] }]),
    "각 항목에 화분을 선택해 주세요.",
  );
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "", quantity: 1, cells: [] }]),
    "각 항목에 작물을 선택해 주세요.",
  );
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 0, cells: [] }]),
    "수량은 1~500 사이로 입력해 주세요.",
  );
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 501, cells: [] }]),
    "수량은 1~500 사이로 입력해 주세요.",
  );
});

test("빈 목록과 정상 행은 통과한다", () => {
  assert.equal(validatePlacementRows([]), "");
  assert.equal(
    validatePlacementRows([{ key: "1", spaceId: "space-1", cropId: "lettuce", quantity: 3, cells: [] }]),
    "",
  );
});

test("화분(spaceId)이 비어 있으면 미배정 채소 풀에 남은 것으로 본다", () => {
  assert.equal(isPlacedRow({ spaceId: "" }), false);
  assert.equal(isPlacedRow({ spaceId: "space-1" }), true);
});

test("작물의 지원 공간에 화분 유형이 포함되어야 배치 가능하다", () => {
  const lettuce = { id: "lettuce", supportedSpaces: ["balcony", "indoor"] };
  assert.equal(canPlaceCropInSpace(lettuce, { id: "space-1", type: "balcony" }), true);
  assert.equal(canPlaceCropInSpace(lettuce, { id: "space-2", type: "garden" }), false);
});

test("자동 배치는 미배정 채소만 호환 화분에 순서대로 채운다", () => {
  const crops = [
    { id: "lettuce", supportedSpaces: ["balcony"] },
    { id: "basil", supportedSpaces: ["indoor", "balcony"] },
  ];
  const spaces = [
    { id: "pot-a", type: "balcony" },
    { id: "pot-b", type: "balcony" },
  ];
  const rows: ContainerPlacementRow[] = [
    { key: "1", spaceId: "pot-b", cropId: "lettuce", quantity: 4, cells: [] }, // 이미 배치됨 — 그대로 유지
    { key: "2", spaceId: "", cropId: "basil", quantity: 2, cells: [] },
    { key: "3", spaceId: "", cropId: "basil", quantity: 1, cells: [] },
  ];

  const result = autoPlaceRows(rows, crops, spaces);

  assert.deepEqual(result.map((row) => row.spaceId), ["pot-b", "pot-a", "pot-b"]);
});

test("호환되는 화분이 없는 미배정 채소는 그대로 미배정으로 남는다", () => {
  const crops = [{ id: "tomato", supportedSpaces: ["garden"] }];
  const spaces = [{ id: "pot-a", type: "balcony" }];
  const rows: ContainerPlacementRow[] = [
    { key: "1", spaceId: "", cropId: "tomato", quantity: 1, cells: [] },
  ];

  const result = autoPlaceRows(rows, crops, spaces);

  assert.equal(result[0].spaceId, "");
});
