import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import type { SeasonRecord } from "../domain/season-record.ts";
import {
  addSeasonRecord,
  deleteSeasonRecord,
  InvalidSeasonRecordDataError,
  loadSeasonRecords,
} from "./season-record-storage.ts";

const record: SeasonRecord = {
  id: "record-1",
  seasonId: "season-1",
  type: "watering",
  recordedOn: "2026-04-10",
  notes: "오전 물주기",
  createdAt: "2026-04-10T09:00:00.000Z",
};

test("시즌 기록을 누적 저장하고 삭제한다", () => {
  const storage = createMemoryStorage();
  const second = { ...record, id: "record-2", type: "growth" as const };

  addSeasonRecord(storage, record);
  addSeasonRecord(storage, second);
  assert.deepEqual(loadSeasonRecords(storage), [record, second]);

  deleteSeasonRecord(storage, record.id);
  assert.deepEqual(loadSeasonRecords(storage), [second]);
});

test("중복 ID 저장과 없는 기록 삭제를 거부한다", () => {
  const storage = createMemoryStorage();
  addSeasonRecord(storage, record);

  assert.throws(() => addSeasonRecord(storage, record), /이미 저장된/);
  assert.throws(() => deleteSeasonRecord(storage, "missing"), /찾을 수 없습니다/);
});

test("형식이 잘못된 기록은 저장하지 않는다", () => {
  const storage = createMemoryStorage();
  const invalid = { ...record, createdAt: "2026-04-10" };

  assert.throws(
    () => addSeasonRecord(storage, invalid),
    InvalidSeasonRecordDataError,
  );
  assert.deepEqual(loadSeasonRecords(storage), []);
});

test("잘못된 종류, 날짜와 중복 ID가 저장된 데이터를 거부한다", () => {
  const invalidType = JSON.stringify([{ ...record, type: "unknown" }]);
  const invalidDate = JSON.stringify([{ ...record, recordedOn: "2026-02-30" }]);
  const invalidCreatedAt = JSON.stringify([{ ...record, createdAt: "2026-04-10" }]);
  const duplicateIds = JSON.stringify([record, { ...record, notes: "중복" }]);

  for (const snapshot of [
    invalidType,
    invalidDate,
    invalidCreatedAt,
    duplicateIds,
    "{",
  ]) {
    assert.throws(
      () => loadSeasonRecords(createMemoryStorage(snapshot)),
      InvalidSeasonRecordDataError,
    );
  }
});

function createMemoryStorage(initial?: string): KeyValueStorage {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    removeItem: () => { value = null; },
  };
}
