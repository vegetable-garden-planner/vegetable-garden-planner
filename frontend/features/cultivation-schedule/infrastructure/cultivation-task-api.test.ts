import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationTask } from "../domain/cultivation-task.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import {
  deleteCultivationTask,
  deleteSeasonCultivationTasks,
  fetchCultivationTasks,
  generateCultivationTasks,
  updateCultivationTask,
} from "./cultivation-task-api.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) {
    Object.defineProperty(globalThis, "document", originalDocument);
  } else {
    Reflect.deleteProperty(globalThis, "document");
  }
});

test("내 재배 일정 목록을 한 번의 요청으로 불러온다", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ data: [createTask()] });
  };

  const tasks = await fetchCultivationTasks();

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.id, "task-1");
  assert.equal(requestedUrl, "/api/v1/tasks?perPage=100");
});

test("일정 생성은 현재 배치 버전을 If-Match로 전송한다", async () => {
  prepareDocumentCookie();
  let requestedUrl = "";
  let method = "";
  let ifMatch: string | null = null;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    method = init?.method ?? "";
    ifMatch = new Headers(init?.headers).get("If-Match");
    return Response.json({ data: [createTask()] }, { status: 201 });
  };

  await generateCultivationTasks(createLayout());

  assert.equal(requestedUrl, "/api/v1/seasons/season-1/tasks/generate");
  assert.equal(method, "POST");
  assert.equal(ifMatch, '"3"');
});

test("일정 수정과 개별 삭제는 일정 버전을 사용한다", async () => {
  prepareDocumentCookie();
  const requests: Array<{ method: string; ifMatch: string | null; body: string }> = [];
  globalThis.fetch = async (_input, init) => {
    requests.push({
      method: init?.method ?? "",
      ifMatch: new Headers(init?.headers).get("If-Match"),
      body: String(init?.body ?? ""),
    });
    return init?.method === "DELETE"
      ? new Response(null, { status: 204 })
      : Response.json({ data: { ...createTask(), status: "completed", version: 5 } });
  };

  const task = createTask();
  const updated = await updateCultivationTask(task, { status: "completed" });
  await deleteCultivationTask(task);

  assert.equal(updated.version, 5);
  assert.deepEqual(requests, [
    { method: "PATCH", ifMatch: '"4"', body: '{"status":"completed"}' },
    { method: "DELETE", ifMatch: '"4"', body: "" },
  ]);
});

test("시즌 일정 전체 삭제는 모든 id와 version을 한 요청에 담는다", async () => {
  prepareDocumentCookie();
  let requestBody = "";
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return new Response(null, { status: 204 });
  };
  const first = createTask();
  const second = { ...createTask(), id: "task-2", version: 7 };

  await deleteSeasonCultivationTasks("season-1", [first, second]);

  assert.deepEqual(JSON.parse(requestBody), {
    tasks: [
      { id: "task-1", version: 4 },
      { id: "task-2", version: 7 },
    ],
  });
});

test("서버 오류를 빈 일정으로 숨기지 않고 호출자에게 전달한다", async () => {
  globalThis.fetch = async () => Response.json(
    { error: { code: "SERVER_FAILURE", message: "일정 서버 오류" } },
    { status: 500 },
  );

  await assert.rejects(fetchCultivationTasks(), (error: Error) => error.message === "일정 서버 오류");
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}

function createTask(): CultivationTask {
  return {
    id: "task-1",
    seasonId: "season-1",
    cropId: "lettuce",
    type: "transplanting",
    title: "상추 모종 심기",
    dueDate: "2026-04-01",
    notes: "",
    status: "pending",
    completedAt: null,
    version: 4,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

function createLayout(): GardenLayout {
  return {
    seasonId: "season-1",
    spaceId: "space-1",
    spaceWidthCm: 200,
    spaceLengthCm: 100,
    cellSizeCm: 25,
    columns: 8,
    rows: 4,
    placements: [{ cellIndex: 0, cropId: "lettuce" }],
    version: 3,
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}
