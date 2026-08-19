import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCachedResources,
  hasResource,
  loadResource,
  readResource,
  reloadResource,
  subscribeResource,
} from "./resource-cache.ts";

test.afterEach(() => { clearCachedResources(); });

test("같은 자원을 동시에 요청해도 서버 요청은 한 번만 보낸다", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return ["a"]; };

  await Promise.all([
    loadResource("spaces", fetcher, "실패"),
    loadResource("spaces", fetcher, "실패"),
    loadResource("spaces", fetcher, "실패"),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(readResource<string[]>("spaces"), { status: "ready", data: ["a"] });
});

test("이미 불러온 자원은 화면을 다시 열어도 재요청하지 않는다", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return ["a"]; };

  await loadResource("spaces", fetcher, "실패");
  assert.equal(hasResource("spaces"), true);

  // 훅이 마운트될 때의 조건과 같다.
  if (!hasResource("spaces")) await loadResource("spaces", fetcher, "실패");

  assert.equal(calls, 1);
});

test("reload는 캐시를 버리고 다시 요청한다", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return [`call-${calls}`]; };

  await loadResource("tasks", fetcher, "실패");
  await reloadResource("tasks", fetcher, "실패");

  assert.equal(calls, 2);
  assert.deepEqual(readResource<string[]>("tasks"), { status: "ready", data: ["call-2"] });
});

test("실패는 빈 목록이 아니라 오류 상태로 남긴다", async () => {
  await loadResource("seasons", async () => { throw new Error("서버 오류"); }, "기본 문구");
  assert.deepEqual(readResource("seasons"), { status: "error", message: "서버 오류" });

  await reloadResource("seasons", async () => { throw "문자열"; }, "기본 문구");
  assert.deepEqual(readResource("seasons"), { status: "error", message: "기본 문구" });
});

test("로그아웃하면 이전 사용자의 캐시가 남지 않고 구독자에게 알린다", async () => {
  let notified = 0;
  const unsubscribe = subscribeResource("spaces", () => { notified += 1; });

  await loadResource("spaces", async () => ["이전 사용자 공간"], "실패");
  assert.equal(hasResource("spaces"), true);

  clearCachedResources();

  assert.equal(hasResource("spaces"), false);
  assert.deepEqual(readResource("spaces"), { status: "loading" });
  assert.ok(notified >= 2, "저장 시점과 초기화 시점 모두 구독자에게 알려야 한다");
  unsubscribe();
});

test("구독을 해제하면 더 이상 알림을 받지 않는다", async () => {
  let notified = 0;
  const unsubscribe = subscribeResource("layouts", () => { notified += 1; });
  unsubscribe();

  await loadResource("layouts", async () => [], "실패");

  assert.equal(notified, 0);
});
