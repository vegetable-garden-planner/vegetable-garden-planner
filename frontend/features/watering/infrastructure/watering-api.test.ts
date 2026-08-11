import assert from "node:assert/strict";
import test from "node:test";
import type { WateringSchedule } from "../domain/watering.ts";
import {
  completeWatering,
  createWateringSchedule,
  deleteWateringSchedule,
  fetchSeasonWateringSchedules,
  fetchWateringHistory,
  reopenWateringCompletion,
  snoozeWatering,
  updateWateringSchedule,
} from "./watering-api.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

test("시즌 물주기 일정 목록을 한 번의 요청으로 불러온다", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ data: [createSchedule()] });
  };

  const schedules = await fetchSeasonWateringSchedules("season/1");
  assert.equal(schedules.length, 1);
  assert.equal(requestedUrl, "/api/v1/seasons/season%2F1/watering-schedules?perPage=100");
});

test("일정 생성은 서버 입력 필드만 전송한다", async () => {
  prepareDocumentCookie();
  let request: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    request = init;
    return Response.json({ data: createSchedule() }, { status: 201 });
  };

  await createWateringSchedule("season-1", {
    cropId: "lettuce",
    intervalDays: 3,
    nextWateringAt: "2026-05-01T09:00:00+09:00",
    enabled: true,
  });
  assert.equal(request?.method, "POST");
  assert.deepEqual(JSON.parse(String(request?.body)), {
    cropId: "lettuce",
    intervalDays: 3,
    nextWateringAt: "2026-05-01T09:00:00+09:00",
    enabled: true,
  });
});

test("일정 수정·삭제·완료·미루기는 현재 버전을 If-Match로 보낸다", async () => {
  prepareDocumentCookie();
  const requests: Array<{ url: string; method: string; version: string | null; body: string }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      version: new Headers(init?.headers).get("If-Match"),
      body: String(init?.body ?? ""),
    });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (String(input).endsWith("/complete")) {
      return Response.json({ data: { schedule: createSchedule(), log: createLog() } }, { status: 201 });
    }
    if (String(input).endsWith("/snoozes")) {
      return Response.json({ data: { schedule: createSchedule(), snooze: {} } }, { status: 201 });
    }
    return Response.json({ data: createSchedule() });
  };
  const schedule = createSchedule();

  await updateWateringSchedule(schedule, { intervalDays: 5 });
  await completeWatering(schedule, { wateredAt: "2026-05-01T09:00:00+09:00", amountMl: null, memo: "" });
  await snoozeWatering(schedule, "2026-05-02T09:00:00+09:00");
  await deleteWateringSchedule(schedule);

  assert.deepEqual(requests.map(({ method, version }) => ({ method, version })), [
    { method: "PATCH", version: '"4"' },
    { method: "POST", version: '"4"' },
    { method: "POST", version: '"4"' },
    { method: "DELETE", version: '"4"' },
  ]);
  assert.equal(requests[1]?.body, '{"wateredAt":"2026-05-01T09:00:00+09:00","amountMl":null,"memo":""}');
});

test("완료·미루기 이력을 병렬 조회하고 최신 완료 취소에 일정 버전을 사용한다", async () => {
  prepareDocumentCookie();
  const urls: string[] = [];
  let reopenVersion: string | null = null;
  globalThis.fetch = async (input, init) => {
    urls.push(String(input));
    if (init?.method === "DELETE") {
      reopenVersion = new Headers(init.headers).get("If-Match");
      return Response.json({ data: { ...createSchedule(), version: 5 } });
    }
    return Response.json({ data: String(input).includes("/logs") ? [createLog()] : [] });
  };
  const schedule = createSchedule();
  const history = await fetchWateringHistory(schedule.id);
  const reopened = await reopenWateringCompletion(schedule, history.logs[0]!);

  assert.equal(history.logs.length, 1);
  assert.equal(history.snoozes.length, 0);
  assert.equal(reopened.version, 5);
  assert.equal(reopenVersion, '"4"');
  assert.deepEqual(urls.slice(0, 2).sort(), [
    "/api/v1/watering-schedules/schedule-1/logs?perPage=100",
    "/api/v1/watering-schedules/schedule-1/snoozes?perPage=100",
  ]);
});

test("서버 오류를 빈 일정이나 빈 이력으로 숨기지 않는다", async () => {
  globalThis.fetch = async () => Response.json(
    { error: { code: "SERVER_FAILURE", message: "물주기 서버 오류" } },
    { status: 500 },
  );

  await assert.rejects(fetchSeasonWateringSchedules("season-1"), /물주기 서버 오류/);
  await assert.rejects(fetchWateringHistory("schedule-1"), /물주기 서버 오류/);
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}

function createSchedule(): WateringSchedule {
  return {
    id: "schedule-1",
    seasonId: "season-1",
    cropId: "lettuce",
    intervalDays: 3,
    nextWateringAt: "2026-05-01T00:00:00Z",
    enabled: true,
    version: 4,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  };
}

function createLog() {
  return {
    id: "log-1",
    scheduleId: "schedule-1",
    userId: "user-1",
    scheduledFor: "2026-05-01T00:00:00Z",
    wateredAt: "2026-05-01T01:00:00Z",
    amountMl: null,
    memo: "",
    createdAt: "2026-05-01T01:00:00Z",
  };
}
