import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import { createGardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import { saveGardenLayout } from "../../garden-layout/infrastructure/garden-layout-storage.ts";
import { addSeasonRecord } from "../../season-record/infrastructure/season-record-storage.ts";
import { addGrowingSeason, loadGrowingSeasons } from "../infrastructure/season-storage.ts";
import {
  deleteGrowingSeasonWithRelations,
  GrowingSeasonHasLayoutError,
  GrowingSeasonHasRecordsError,
} from "./delete-growing-season.ts";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

const season = {
  id: "season-1",
  spaceId: "space-1",
  name: "봄 시즌",
  startDate: "2026-03-01",
  endDate: "2026-06-30",
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("격자가 없는 시즌은 삭제한다", () => {
  const storage = createMemoryStorage();
  addGrowingSeason(storage, season);

  deleteGrowingSeasonWithRelations(storage, season.id);

  assert.deepEqual(loadGrowingSeasons(storage), []);
});

test("격자가 연결된 시즌 삭제를 거부하고 시즌을 유지한다", () => {
  const storage = createMemoryStorage();
  addGrowingSeason(storage, season);
  const layout = createGardenLayout(
    season.id,
    season.spaceId,
    100,
    100,
    25,
    "2026-08-06T00:00:00.000Z",
  );
  if (!layout.valid) assert.fail(layout.message);
  saveGardenLayout(storage, layout.layout);

  assert.throws(
    () => deleteGrowingSeasonWithRelations(storage, season.id),
    GrowingSeasonHasLayoutError,
  );
  assert.deepEqual(loadGrowingSeasons(storage), [season]);
});

test("기록이 연결된 시즌 삭제를 거부하고 시즌을 유지한다", () => {
  const storage = createMemoryStorage();
  addGrowingSeason(storage, season);
  addSeasonRecord(storage, {
    id: "record-1",
    seasonId: season.id,
    type: "watering",
    recordedOn: "2026-04-10",
    notes: "오전 물주기",
    createdAt: "2026-04-10T09:00:00.000Z",
  });

  assert.throws(
    () => deleteGrowingSeasonWithRelations(storage, season.id),
    GrowingSeasonHasRecordsError,
  );
  assert.deepEqual(loadGrowingSeasons(storage), [season]);
});
