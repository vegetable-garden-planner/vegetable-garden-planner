import assert from "node:assert/strict";
import test from "node:test";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import {
  addGrowingSpace,
  InvalidGrowingSpaceDataError,
  loadGrowingSpaces,
  type KeyValueStorage,
} from "./space-storage.ts";

function createMemoryStorage(initial?: string): KeyValueStorage {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
  };
}

const space: GrowingSpace = {
  id: "space-1",
  name: "베란다",
  type: "balcony",
  sunlight: "full",
  widthCm: 400,
  lengthCm: 150,
  region: "서울특별시",
  notes: "",
  createdAt: "2026-08-05T00:00:00.000Z",
};

test("저장 데이터가 없으면 빈 목록을 반환한다", () => {
  assert.deepEqual(loadGrowingSpaces(createMemoryStorage()), []);
});

test("공간을 추가하고 다시 조회한다", () => {
  const storage = createMemoryStorage();
  addGrowingSpace(storage, space);
  assert.deepEqual(loadGrowingSpaces(storage), [space]);
});

test("손상된 JSON은 호출자에게 오류를 전달한다", () => {
  assert.throws(
    () => loadGrowingSpaces(createMemoryStorage("not-json")),
    SyntaxError,
  );
});

test("형식이 잘못된 저장 데이터는 명시적 오류를 발생시킨다", () => {
  assert.throws(
    () => loadGrowingSpaces(createMemoryStorage(JSON.stringify([{ id: 1 }]))),
    InvalidGrowingSpaceDataError,
  );
});
