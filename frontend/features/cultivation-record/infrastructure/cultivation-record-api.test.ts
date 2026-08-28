import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationRecord, CultivationRecordInput } from "../domain/cultivation-record.ts";
import {
  createCultivationRecord,
  deleteCultivationRecord,
  deleteCultivationRecordPhoto,
  fetchSeasonRecords,
  updateCultivationRecord,
  uploadCultivationRecordPhoto,
} from "./cultivation-record-api.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

test("시즌 기록을 최신순 목록 API에서 조회하고 종류를 필터링한다", async () => {
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return Response.json({ data: [record()] });
  };

  await fetchSeasonRecords("season/1");
  await fetchSeasonRecords("season/1", "growth");
  assert.deepEqual(urls, [
    "/api/v1/seasons/season%2F1/records?perPage=100",
    "/api/v1/seasons/season%2F1/records?perPage=100&type=growth",
  ]);
});

test("기록 생성은 입력 필드만 전송한다", async () => {
  prepareDocumentCookie();
  let request: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    request = init;
    return Response.json({ data: record() }, { status: 201 });
  };
  const input = recordInput();
  await createCultivationRecord("season-1", input);

  assert.equal(request?.method, "POST");
  assert.deepEqual(JSON.parse(String(request?.body)), input);
});

test("기록 수정과 삭제는 현재 버전을 If-Match로 전송한다", async () => {
  prepareDocumentCookie();
  const requests: Array<{ method: string; version: string | null }> = [];
  globalThis.fetch = async (_input, init) => {
    requests.push({ method: init?.method ?? "GET", version: new Headers(init?.headers).get("If-Match") });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json({ data: { ...record(), version: 4 } });
  };

  await updateCultivationRecord(record(), recordInput());
  await deleteCultivationRecord(record());
  assert.deepEqual(requests, [
    { method: "PATCH", version: '"3"' },
    { method: "DELETE", version: '"3"' },
  ]);
});

test("사진 업로드는 FormData로 보내고 Content-Type을 직접 지정하지 않는다", async () => {
  prepareDocumentCookie();
  let request: RequestInit | undefined;
  let url = "";
  globalThis.fetch = async (input, init) => {
    url = String(input);
    request = init;
    return Response.json({ data: { ...record(), photoUrl: "https://api.test/uploads/records/a.jpg", version: 4 } });
  };

  const photo = new File(["binary"], "garden.jpg", { type: "image/jpeg" });
  const saved = await uploadCultivationRecordPhoto(record(), photo);

  assert.equal(url, "/api/v1/records/record-1/photo");
  assert.equal(request?.method, "POST");
  assert.ok(request?.body instanceof FormData);
  assert.equal((request.body as FormData).get("photo"), photo);
  const headers = new Headers(request?.headers);
  assert.equal(headers.get("If-Match"), '"3"');
  assert.equal(headers.get("Content-Type"), null);
  assert.equal(saved.photoUrl, "https://api.test/uploads/records/a.jpg");
});

test("사진 삭제는 현재 버전을 If-Match로 전송한다", async () => {
  prepareDocumentCookie();
  let request: RequestInit | undefined;
  let url = "";
  globalThis.fetch = async (input, init) => {
    url = String(input);
    request = init;
    return Response.json({ data: { ...record(), version: 4 } });
  };

  const saved = await deleteCultivationRecordPhoto(record());

  assert.equal(url, "/api/v1/records/record-1/photo");
  assert.equal(request?.method, "DELETE");
  assert.equal(new Headers(request?.headers).get("If-Match"), '"3"');
  assert.equal(saved.photoUrl, null);
});

test("기록 서버 오류를 빈 목록으로 숨기지 않는다", async () => {
  globalThis.fetch = async () => Response.json(
    { error: { code: "SERVER_FAILURE", message: "기록 서버 오류" } },
    { status: 500 },
  );
  await assert.rejects(fetchSeasonRecords("season-1"), /기록 서버 오류/);
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}

function recordInput(): CultivationRecordInput {
  return { type: "growth", occurredAt: "2026-05-01T09:00:00+09:00", notes: "키 측정", quantity: 10, unit: "cm" };
}

function record(): CultivationRecord {
  return {
    id: "record-1", seasonId: "season-1", type: "growth", occurredAt: "2026-05-01T00:00:00Z",
    notes: "키 측정", quantity: 10, unit: "cm", photoUrl: null, version: 3,
    createdAt: "2026-05-01T00:00:00Z", updatedAt: "2026-05-01T00:00:00Z",
  };
}
