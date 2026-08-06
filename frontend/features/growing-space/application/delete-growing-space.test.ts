import assert from "node:assert/strict";
import test from "node:test";
import { addGrowingSeason } from "../../growing-season/infrastructure/season-storage.ts";
import { addGrowingSpace, loadGrowingSpaces } from "../infrastructure/space-storage.ts";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import {
  deleteGrowingSpaceWithRelations,
  GrowingSpaceHasSeasonsError,
} from "./delete-growing-space.ts";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

const space = {
  id: "space-1",
  name: "베란다",
  type: "balcony" as const,
  sunlight: "full" as const,
  widthCm: 400,
  lengthCm: 150,
  region: "서울특별시",
  notes: "",
  createdAt: "2026-08-05T00:00:00.000Z",
};

test("연결된 시즌이 없는 공간은 삭제한다", () => {
  const storage = createMemoryStorage();
  addGrowingSpace(storage, space);

  deleteGrowingSpaceWithRelations(storage, space.id);

  assert.deepEqual(loadGrowingSpaces(storage), []);
});

test("연결된 시즌이 있는 공간 삭제는 거부하고 데이터를 유지한다", () => {
  const storage = createMemoryStorage();
  addGrowingSpace(storage, space);
  addGrowingSeason(storage, {
    id: "season-1",
    spaceId: space.id,
    name: "봄 시즌",
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  assert.throws(
    () => deleteGrowingSpaceWithRelations(storage, space.id),
    GrowingSpaceHasSeasonsError,
  );
  assert.deepEqual(loadGrowingSpaces(storage), [space]);
});
