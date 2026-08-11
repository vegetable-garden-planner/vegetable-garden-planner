import assert from "node:assert/strict";
import test from "node:test";
import type { GardenLayout } from "../domain/garden-layout.ts";
import {
  fetchGardenLayouts,
  putGardenLayout,
} from "./garden-layout-api.ts";

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

test("소유한 배치 목록을 한 번의 요청으로 불러온다", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ data: [createLayout("season-ready", 2)] });
  };

  const layouts = await fetchGardenLayouts();

  assert.equal(layouts.length, 1);
  assert.equal(layouts[0]?.seasonId, "season-ready");
  assert.equal(requestedUrl, "/api/v1/layouts?perPage=100");
});

test("서버 오류는 빈 배치로 숨기지 않는다", async () => {
  globalThis.fetch = async () => Response.json(
    { error: { code: "SERVER_FAILURE", message: "서버 오류" } },
    { status: 500 },
  );

  await assert.rejects(
    fetchGardenLayouts(),
    (error: Error) => error.message === "서버 오류",
  );
});

test("배치 교체는 현재 version을 If-Match로 보내고 저장 필드만 전송한다", async () => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
  const layout = createLayout("season-1", 3);
  let requestBody = "";
  let ifMatch: string | null = null;

  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    ifMatch = headers.get("If-Match");
    requestBody = String(init?.body);
    return Response.json({ data: { ...layout, version: 4 } });
  };

  const saved = await putGardenLayout(layout);

  assert.equal(ifMatch, '"3"');
  assert.equal(saved.version, 4);
  assert.deepEqual(JSON.parse(requestBody), {
    spaceWidthCm: 200,
    spaceLengthCm: 100,
    cellSizeCm: 25,
    placements: [{ cellIndex: 0, cropId: "lettuce" }],
  });
});

function createLayout(seasonId: string, version: number): GardenLayout {
  return {
    seasonId,
    spaceId: "space-1",
    spaceWidthCm: 200,
    spaceLengthCm: 100,
    cellSizeCm: 25,
    columns: 8,
    rows: 4,
    placements: [{ cellIndex: 0, cropId: "lettuce" }],
    version,
    updatedAt: "2026-08-11T00:00:00.000Z",
  };
}
