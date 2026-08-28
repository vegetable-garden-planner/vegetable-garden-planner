import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCachedResources,
  hasResource,
  invalidateResource,
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

test("reload 중에는 로딩 상태로 비우지 않고 이전 값을 그대로 보여준다", async () => {
  let resolveSecond: ((value: string[]) => void) | undefined;
  const first = async () => ["기존 값"];
  const second = () => new Promise<string[]>((resolve) => { resolveSecond = resolve; });

  await loadResource("layouts", first, "실패");
  const pending = reloadResource("layouts", second, "실패");

  assert.deepEqual(readResource<string[]>("layouts"), { status: "ready", data: ["기존 값"] });

  resolveSecond?.(["새 값"]);
  await pending;
  assert.deepEqual(readResource<string[]>("layouts"), { status: "ready", data: ["새 값"] });
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

test("목록을 바꾸면 캐시를 버리고 구독자에게 알려 다시 불러오게 한다", async () => {
  let calls = 0;
  const fetchSeasons = async () => { calls += 1; return [`시즌 ${calls}`]; };
  let notified = 0;
  const unsubscribe = subscribeResource("seasons", () => { notified += 1; });

  await loadResource("seasons", fetchSeasons, "실패");
  assert.deepEqual(readResource("seasons"), { status: "ready", data: ["시즌 1"] });

  invalidateResource("seasons");

  assert.equal(hasResource("seasons"), false, "캐시가 남아 있으면 예전 목록을 그대로 보여 준다");
  assert.equal(notified, 2, "화면에 떠 있는 목록이 다시 불러오도록 알려야 한다");

  await loadResource("seasons", fetchSeasons, "실패");
  assert.deepEqual(readResource("seasons"), { status: "ready", data: ["시즌 2"] });
  assert.equal(calls, 2);
  unsubscribe();
});

test("요청이 진행 중일 때 목록을 바꾸면 그 응답을 캐시로 쓰지 않는다", async () => {
  let resolveFirst: ((value: string[]) => void) | undefined;
  const slow = async () => new Promise<string[]>((resolve) => { resolveFirst = resolve; });

  const pending = loadResource("spaces", slow, "실패");
  invalidateResource("spaces");
  resolveFirst?.(["삭제된 공간"]);
  await pending;

  await loadResource("spaces", async () => ["새 공간"], "실패");
  assert.deepEqual(readResource("spaces"), { status: "ready", data: ["새 공간"] });
});
