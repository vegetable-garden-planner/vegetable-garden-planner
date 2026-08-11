import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import { saveSeasonCultivationTasks } from "../../cultivation-schedule/infrastructure/cultivation-task-storage.ts";
import { addSeasonRecord } from "../../season-record/infrastructure/season-record-storage.ts";
import {
  assertGrowingSeasonCanBeDeleted,
  GrowingSeasonHasRecordsError,
  GrowingSeasonHasTasksError,
} from "./delete-growing-season.ts";

const seasonId = "season-1";

test("연결 데이터가 없으면 시즌 삭제를 허용한다", () => {
  assert.doesNotThrow(() => assertGrowingSeasonCanBeDeleted(createMemoryStorage(), seasonId));
});

test("재배 일정이 연결된 시즌 삭제를 거부한다", () => {
  const storage = createMemoryStorage();
  saveSeasonCultivationTasks(storage, seasonId, [createTask()]);
  assert.throws(() => assertGrowingSeasonCanBeDeleted(storage, seasonId), GrowingSeasonHasTasksError);
});

test("기록이 연결된 시즌 삭제를 거부한다", () => {
  const storage = createMemoryStorage();
  addSeasonRecord(storage, {
    id: "record-1", seasonId, type: "watering", recordedOn: "2026-04-10",
    notes: "오전 물주기", createdAt: "2026-04-10T09:00:00.000Z",
  });
  assert.throws(() => assertGrowingSeasonCanBeDeleted(storage, seasonId), GrowingSeasonHasRecordsError);
});

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

function createTask(): CultivationTask {
  return {
    id: "task-1", seasonId, cropId: "lettuce", type: "transplanting", title: "상추 모종 심기",
    dueDate: "2026-04-01", notes: "", status: "pending", completedAt: null,
    createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z",
  };
}
