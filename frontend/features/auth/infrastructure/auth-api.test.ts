import assert from "node:assert/strict";
import test from "node:test";
import type { AuthUser, SignupFormValues } from "../domain/auth.ts";
import { checkEmailAvailability, registerAndStartSession } from "./auth-api.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

test("회원가입 후 서버 세션의 현재 사용자를 확인한다", async () => {
  prepareDocumentCookie();
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });
    if (url === "/api/v1/auth/register") return Response.json({ data: { user } }, { status: 201 });
    return Response.json({ data: user });
  };

  assert.deepEqual(await registerAndStartSession(signupValues), user);
  assert.deepEqual(urls, [
    "/sanctum/csrf-cookie",
    "/api/v1/auth/register",
    "/api/v1/me",
  ]);
});

test("회원가입 응답 뒤 세션이 없으면 로그인된 것으로 처리하지 않는다", async () => {
  prepareDocumentCookie();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });
    if (url === "/api/v1/auth/register") return Response.json({ data: { user } }, { status: 201 });
    return Response.json({ error: { code: "UNAUTHENTICATED", message: "로그인이 필요합니다." } }, { status: 401 });
  };

  await assert.rejects(registerAndStartSession(signupValues), /가입은 완료됐지만 로그인 상태를 시작하지 못했습니다/);
});

test("이메일 중복 확인 결과를 반환한다", async () => {
  prepareDocumentCookie();
  globalThis.fetch = async () => Response.json({ data: { available: false } });
  assert.equal(await checkEmailAvailability("used@example.com"), false);
});

function prepareDocumentCookie(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=test-token" },
  });
}

const signupValues: SignupFormValues = {
  email: "gardener@example.com",
  nickname: "새싹집사",
  password: "garden123",
  passwordConfirmation: "garden123",
  termsAccepted: true,
  privacyAccepted: true,
};

const user: AuthUser = {
  id: "user-1",
  email: signupValues.email,
  nickname: signupValues.nickname,
  role: "member",
  createdAt: "2026-08-11T00:00:00Z",
};
