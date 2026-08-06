import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import { createGardenLayout } from "../domain/garden-layout.ts";
import {
  deleteGardenLayout,
  InvalidGardenLayoutDataError,
  loadGardenLayouts,
  saveGardenLayout,
} from "./garden-layout-storage.ts";

function createMemoryStorage(initial?: string): KeyValueStorage {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    removeItem: () => { value = null; },
  };
}

function createLayout(updatedAt = "2026-08-06T00:00:00.000Z") {
  const result = createGardenLayout("season-1", "space-1", 100, 50, 25, updatedAt);
  if (!result.valid) assert.fail(result.message);
  assert.equal(result.valid, true);
  return result.layout;
}

test("격자를 저장하고 같은 시즌 격자를 갱신한다", () => {
  const storage = createMemoryStorage();
  const layout = createLayout();
  const updated = { ...layout, updatedAt: "2026-08-07T00:00:00.000Z" };

  saveGardenLayout(storage, layout);
  saveGardenLayout(storage, updated);

  assert.deepEqual(loadGardenLayouts(storage), [updated]);
});

test("시즌 격자를 삭제한다", () => {
  const storage = createMemoryStorage();
  saveGardenLayout(storage, createLayout());
  deleteGardenLayout(storage, "season-1");
  assert.deepEqual(loadGardenLayouts(storage), []);
});

test("없는 격자 삭제를 거부한다", () => {
  assert.throws(() => deleteGardenLayout(createMemoryStorage(), "missing"));
});

test("중복 셀과 범위 밖 셀이 있는 저장 데이터를 거부한다", () => {
  const layout = createLayout();
  const duplicateCells = JSON.stringify([{
    ...layout,
    placements: [
      { cellIndex: 0, cropId: "lettuce" },
      { cellIndex: 0, cropId: "carrot" },
    ],
  }]);
  const outsideCell = JSON.stringify([{
    ...layout,
    placements: [{ cellIndex: 8, cropId: "lettuce" }],
  }]);

  assert.throws(
    () => loadGardenLayouts(createMemoryStorage(duplicateCells)),
    InvalidGardenLayoutDataError,
  );
  assert.throws(
    () => loadGardenLayouts(createMemoryStorage(outsideCell)),
    InvalidGardenLayoutDataError,
  );
});
