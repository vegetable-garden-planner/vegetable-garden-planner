import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import type { CultivationTask } from "../domain/cultivation-task.ts";
import {
  InvalidCultivationTaskDataError,
  loadCultivationTasks,
  saveSeasonCultivationTasks,
} from "./cultivation-task-storage.ts";

function createMemoryStorage(initial?: string): KeyValueStorage {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    removeItem: () => { value = null; },
  };
}

function createTask(id: string, seasonId = "season-1"): CultivationTask {
  return {
    id,
    seasonId,
    cropId: "lettuce",
    type: "transplanting",
    title: "상추 모종 심기",
    dueDate: "2026-04-01",
    notes: "테스트 일정",
    status: "pending",
    completedAt: null,
    createdAt: "2026-08-07T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
  };
}

test("시즌 일정을 저장하고 기존 자동 생성 일정을 교체한다", () => {
  const storage = createMemoryStorage();
  const otherSeasonTask = createTask("other", "season-2");
  const first = createTask("first");
  const regenerated = createTask("regenerated");

  saveSeasonCultivationTasks(storage, "season-2", [otherSeasonTask]);
  saveSeasonCultivationTasks(storage, "season-1", [first]);
  saveSeasonCultivationTasks(storage, "season-1", [regenerated]);

  assert.deepEqual(loadCultivationTasks(storage), [otherSeasonTask, regenerated]);
});

test("빈 목록으로 저장하면 다른 시즌은 유지하고 해당 시즌 일정만 삭제한다", () => {
  const storage = createMemoryStorage();
  const otherSeasonTask = createTask("other", "season-2");
  saveSeasonCultivationTasks(storage, "season-2", [otherSeasonTask]);
  saveSeasonCultivationTasks(storage, "season-1", [createTask("target")]);

  saveSeasonCultivationTasks(storage, "season-1", []);

  assert.deepEqual(loadCultivationTasks(storage), [otherSeasonTask]);
});

test("다른 시즌의 일정을 섞어 저장하지 않는다", () => {
  const storage = createMemoryStorage();

  assert.throws(
    () => saveSeasonCultivationTasks(storage, "season-1", [createTask("task", "season-2")]),
    /다른 시즌/,
  );
  assert.deepEqual(loadCultivationTasks(storage), []);
});

test("중복 ID와 잘못된 상태 또는 날짜가 저장된 데이터를 거부한다", () => {
  const task = createTask("duplicate");
  const duplicate = JSON.stringify([task, task]);
  const invalidStatus = JSON.stringify([{ ...task, status: "unknown" }]);
  const invalidDate = JSON.stringify([{ ...task, dueDate: "2026-02-30" }]);

  for (const snapshot of [duplicate, invalidStatus, invalidDate]) {
    assert.throws(
      () => loadCultivationTasks(createMemoryStorage(snapshot)),
      InvalidCultivationTaskDataError,
    );
  }
});
