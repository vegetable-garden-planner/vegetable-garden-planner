import assert from "node:assert/strict";
import test from "node:test";
import { putContainerPlacements } from "./container-placement-api.ts";
import { hasResource, loadResource } from "../../../shared/infrastructure/resource-cache.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

test("배치를 저장하면 그 시즌의 배치 캐시를 버린다", async () => {
  prepareDocumentCookie();
  globalThis.fetch = async () => Response.json({
    data: { seasonId: "season-1", placements: [], version: 2 },
  });

  await loadResource("container-placements:season-1", async () => ({
    seasonId: "season-1",
    placements: [],
    version: 1,
  }), "실패");
  assert.equal(hasResource("container-placements:season-1"), true);

  await putContainerPlacements("season-1", 1, []);

  assert.equal(
    hasResource("container-placements:season-1"),
    false,
    "저장 뒤에도 캐시가 남으면 다른 화면(예: 배치 결과 요약)이 예전 배치를 보여준다",
  );
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}
