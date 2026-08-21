import assert from "node:assert/strict";
import test from "node:test";
import { cancelSubscription, getMySubscription, subscribe } from "./subscription-api.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

const subscriptionPayload = {
  id: "sub-1",
  planCode: "pro",
  status: "active",
  currentPeriodStart: "2026-08-21T00:00:00.000Z",
  currentPeriodEnd: "2026-09-21T00:00:00.000Z",
  canceledAt: null,
  version: 1,
};

test("구독이 있으면 조회한다", async () => {
  prepareDocumentCookie();
  globalThis.fetch = async () => Response.json({ data: subscriptionPayload });

  const subscription = await getMySubscription();

  assert.deepEqual(subscription, subscriptionPayload);
});

test("구독이 없으면 null을 반환한다", async () => {
  prepareDocumentCookie();
  globalThis.fetch = async () => Response.json(
    { error: { code: "RESOURCE_NOT_FOUND", message: "없음" } },
    { status: 404 },
  );

  const subscription = await getMySubscription();

  assert.equal(subscription, null);
});

test("authKey로 구독을 신청한다", async () => {
  prepareDocumentCookie();
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return Response.json({ data: subscriptionPayload }, { status: 201 });
  };

  const subscription = await subscribe("auth-key-1");

  assert.deepEqual(calls, [
    { url: "/api/v1/subscriptions", body: { auth_key: "auth-key-1" } },
  ]);
  assert.deepEqual(subscription, subscriptionPayload);
});

test("버전과 함께 구독을 해지한다", async () => {
  prepareDocumentCookie();
  const calls: { url: string; method: string | undefined; ifMatch: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });
    calls.push({ url, method: init?.method, ifMatch: new Headers(init?.headers).get("If-Match") });
    return new Response(null, { status: 204 });
  };

  await cancelSubscription("sub-1", 2);

  assert.deepEqual(calls, [{ url: "/api/v1/subscriptions/sub-1", method: "DELETE", ifMatch: "\"2\"" }]);
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}
