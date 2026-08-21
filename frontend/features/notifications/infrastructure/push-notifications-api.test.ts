import assert from "node:assert/strict";
import test from "node:test";
import { subscribePush, unsubscribePush } from "./push-notifications-api.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

test("구독 정보를 POST로 전송한다", async () => {
  prepareDocumentCookie();
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(null, { status: 204 });
  };

  await subscribePush({ endpoint: "https://push.example.com/abc", keys: { p256dh: "p", auth: "a" } });

  assert.deepEqual(calls, [
    { url: "/api/v1/push-subscriptions", body: { endpoint: "https://push.example.com/abc", keys: { p256dh: "p", auth: "a" } } },
  ]);
});

test("endpoint로 구독을 해제한다", async () => {
  prepareDocumentCookie();
  const calls: { url: string; method: string | undefined }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });
    calls.push({ url, method: init?.method });
    return new Response(null, { status: 204 });
  };

  await unsubscribePush("https://push.example.com/abc");

  assert.deepEqual(calls, [{ url: "/api/v1/push-subscriptions", method: "DELETE" }]);
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}
