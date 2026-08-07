import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import {
  createWateringSchedule,
  type WateringRule,
  type WateringSchedule,
} from "../domain/watering.ts";
import {
  completeStoredWatering,
  InvalidWateringStorageDataError,
  loadWateringData,
  reopenStoredWatering,
  saveWateringSchedule,
  setStoredWateringScheduleEnabled,
  snoozeStoredWatering,
} from "./watering-storage.ts";

const rules: readonly WateringRule[] = [{
  cropId: "tomato",
  growthStage: "default",
  intervalDays: 3,
  guideText: "흙 상태를 확인합니다.",
}];

test("물주기 일정을 저장하고 같은 일정은 갱신한다", () => {
  const storage = createMemoryStorage();
  const schedule = createSchedule();
  const updated = { ...schedule, nextWateringAt: "2026-08-11T00:00:00.000Z" };

  saveWateringSchedule(storage, schedule);
  saveWateringSchedule(storage, updated);

  assert.deepEqual(loadWateringData(storage).schedules, [updated]);
});

test("한 재배 대상에 서로 다른 일정 두 개를 저장하지 않는다", () => {
  const storage = createMemoryStorage();
  const schedule = createSchedule();
  saveWateringSchedule(storage, schedule);

  assert.throws(
    () => saveWateringSchedule(storage, { ...schedule, id: "schedule-2" }),
    /이미 물주기 일정/,
  );
  assert.deepEqual(loadWateringData(storage).schedules, [schedule]);
});

test("완료 저장과 완료 취소를 한 단위로 처리한다", () => {
  const storage = createMemoryStorage();
  const schedule = createSchedule();
  saveWateringSchedule(storage, schedule);

  const completed = completeStoredWatering(storage, schedule.id, {
    id: "log-1",
    userId: "user-1",
    wateredAt: "2026-08-11T09:00:00.000Z",
    amountMl: 400,
    memo: "물주기 완료",
  });
  assert.equal(loadWateringData(storage).logs.length, 1);
  assert.equal(
    loadWateringData(storage).schedules[0]?.nextWateringAt,
    "2026-08-14T09:00:00.000Z",
  );

  const reopened = reopenStoredWatering(
    storage,
    completed.log.id,
    "2026-08-11T10:00:00.000Z",
  );
  assert.equal(reopened.nextWateringAt, schedule.nextWateringAt);
  assert.deepEqual(loadWateringData(storage).logs, []);
});

test("과거 기록보다 가장 최근 완료 기록부터 취소한다", () => {
  const storage = createMemoryStorage();
  const schedule = createSchedule();
  saveWateringSchedule(storage, schedule);
  completeStoredWatering(storage, schedule.id, {
    id: "log-1",
    userId: "user-1",
    wateredAt: "2026-08-10T09:00:00.000Z",
    memo: "첫 완료",
  });
  completeStoredWatering(storage, schedule.id, {
    id: "log-2",
    userId: "user-1",
    wateredAt: "2026-08-13T09:00:00.000Z",
    memo: "두 번째 완료",
  });

  assert.throws(
    () => reopenStoredWatering(
      storage,
      "log-1",
      "2026-08-13T10:00:00.000Z",
    ),
    /가장 최근/,
  );
  assert.equal(loadWateringData(storage).logs.length, 2);
});

test("연기 이력과 변경된 예정일을 함께 저장한다", () => {
  const storage = createMemoryStorage();
  const schedule = createSchedule();
  saveWateringSchedule(storage, schedule);

  const result = snoozeStoredWatering(storage, schedule.id, {
    id: "snooze-1",
    snoozedUntil: "2026-08-11T08:00:00.000Z",
    updatedAt: "2026-08-09T12:00:00.000Z",
  });
  const stored = loadWateringData(storage);

  assert.deepEqual(stored.snoozes, [result.snooze]);
  assert.equal(stored.schedules[0]?.nextWateringAt, result.snooze.snoozedUntil);
});

test("비활성화한 일정은 완료할 수 없고 기존 데이터를 유지한다", () => {
  const storage = createMemoryStorage();
  const schedule = createSchedule();
  saveWateringSchedule(storage, schedule);
  setStoredWateringScheduleEnabled(
    storage,
    schedule.id,
    false,
    "2026-08-09T00:00:00.000Z",
  );

  assert.throws(() => completeStoredWatering(storage, schedule.id, {
    id: "log-1",
    userId: "user-1",
    wateredAt: "2026-08-10T00:00:00.000Z",
    memo: "",
  }), /비활성화/);
  assert.deepEqual(loadWateringData(storage).logs, []);
});

test("중복 식재 일정과 참조가 끊긴 로그·연기 데이터는 거부한다", () => {
  const schedule = createSchedule();
  const invalidSnapshots = [
    "{",
    JSON.stringify({ schedules: [schedule, { ...schedule, id: "schedule-2" }], logs: [], snoozes: [] }),
    JSON.stringify({
      schedules: [schedule],
      logs: [{
        id: "log-1",
        plantingId: "missing",
        userId: "user-1",
        scheduledFor: schedule.nextWateringAt,
        wateredAt: schedule.nextWateringAt,
        amountMl: null,
        memo: "",
      }],
      snoozes: [],
    }),
    JSON.stringify({
      schedules: [schedule],
      logs: [],
      snoozes: [{
        id: "snooze-1",
        scheduleId: "missing",
        originalDate: schedule.nextWateringAt,
        snoozedUntil: "2026-08-11T00:00:00.000Z",
      }],
    }),
  ];

  for (const snapshot of invalidSnapshots) {
    assert.throws(
      () => loadWateringData(createMemoryStorage(snapshot)),
      InvalidWateringStorageDataError,
    );
  }
});

function createSchedule(): WateringSchedule {
  return createWateringSchedule({
    id: "schedule-1",
    plantingId: "planting-1",
    cropId: "tomato",
    growthStage: "default",
    firstWateringAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
  }, rules);
}

function createMemoryStorage(initial?: string): KeyValueStorage {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    removeItem: () => { value = null; },
  };
}
