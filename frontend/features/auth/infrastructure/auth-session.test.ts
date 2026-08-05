import assert from "node:assert/strict";
import test from "node:test";
import type { KeyValueStorage } from "../../../shared/infrastructure/key-value-storage.ts";
import {
  clearAuthSession,
  createAuthSession,
  getAuthSessionSnapshot,
  InvalidAuthSessionDataError,
  parseAuthSessionSnapshot,
  saveAuthSession,
} from "./auth-session.ts";

function createMemoryStorage(initial = ""): KeyValueStorage {
  let value = initial || null;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    removeItem: () => { value = null; },
  };
}

test("개발 세션을 저장하고 다시 읽는다", () => {
  const storage = createMemoryStorage();
  const session = createAuthSession(
    { email: "gardener@example.com", nickname: "새싹" },
    "2026-08-05T00:00:00.000Z",
  );
  saveAuthSession(storage, session);
  assert.deepEqual(parseAuthSessionSnapshot(getAuthSessionSnapshot(storage)), session);
});

test("세션에는 비밀번호가 저장되지 않는다", () => {
  const storage = createMemoryStorage();
  saveAuthSession(storage, createAuthSession(
    { email: "gardener@example.com", nickname: "새싹" },
    "2026-08-05T00:00:00.000Z",
  ));
  assert.equal(getAuthSessionSnapshot(storage).includes("password"), false);
});

test("로그아웃하면 세션을 삭제한다", () => {
  const storage = createMemoryStorage("stored");
  clearAuthSession(storage);
  assert.equal(getAuthSessionSnapshot(storage), "");
});

test("손상되거나 형식이 잘못된 세션은 오류를 전달한다", () => {
  assert.throws(() => parseAuthSessionSnapshot("not-json"), SyntaxError);
  assert.throws(
    () => parseAuthSessionSnapshot(JSON.stringify({ user: {} })),
    InvalidAuthSessionDataError,
  );
});
