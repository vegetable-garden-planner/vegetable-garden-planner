import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import { addSeasonRecord } from "../../season-record/infrastructure/season-record-storage.ts";
import {
  assertGrowingSeasonCanBeDeleted,
  GrowingSeasonHasRecordsError,
} from "./delete-growing-season.ts";

const seasonId = "season-1";

test("로컬 기록이 없으면 시즌 삭제를 허용한다", () => {
  assert.doesNotThrow(() => assertGrowingSeasonCanBeDeleted(createMemoryStorage(), seasonId));
});

test("로컬 기록이 연결된 시즌 삭제를 거부한다", () => {
  const storage = createMemoryStorage();
  addSeasonRecord(storage, {
    id: "record-1",
    seasonId,
    type: "watering",
    recordedOn: "2026-04-10",
    notes: "오전 물주기",
    createdAt: "2026-04-10T09:00:00.000Z",
  });
  assert.throws(
    () => assertGrowingSeasonCanBeDeleted(storage, seasonId),
    GrowingSeasonHasRecordsError,
  );
});

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}
