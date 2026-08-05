import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import type { GrowingSeason } from "../domain/growing-season.ts";
import {
  addGrowingSeason,
  InvalidGrowingSeasonDataError,
  loadGrowingSeasons,
} from "./season-storage.ts";

function createMemoryStorage(initial?: string): KeyValueStorage {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    removeItem: () => { value = null; },
  };
}

const season: GrowingSeason = {
  id: "season-1",
  spaceId: "space-1",
  name: "2026년 봄 시즌",
  startDate: "2026-03-01",
  endDate: "2026-06-30",
  notes: "",
  createdAt: "2026-08-05T00:00:00.000Z",
};

test("저장 데이터가 없으면 빈 시즌 목록을 반환한다", () => {
  assert.deepEqual(loadGrowingSeasons(createMemoryStorage()), []);
});

test("시즌을 추가하고 다시 조회한다", () => {
  const storage = createMemoryStorage();
  addGrowingSeason(storage, season);
  assert.deepEqual(loadGrowingSeasons(storage), [season]);
});

test("손상되거나 형식이 잘못된 시즌 데이터는 오류를 전달한다", () => {
  assert.throws(() => loadGrowingSeasons(createMemoryStorage("not-json")), SyntaxError);
  assert.throws(
    () => loadGrowingSeasons(createMemoryStorage(JSON.stringify([{ id: 1 }]))),
    InvalidGrowingSeasonDataError,
  );
});
