import assert from "node:assert/strict";
import test from "node:test";
import { urlBase64ToUint8Array } from "./push-subscription.ts";

test("base64url 문자열을 Uint8Array로 변환한다", () => {
  // "hello" 의 base64url 인코딩
  const result = urlBase64ToUint8Array("aGVsbG8");
  assert.deepEqual(Array.from(result), [104, 101, 108, 108, 111]);
});

test("-와 _를 포함한 base64url도 올바르게 변환한다", () => {
  const result = urlBase64ToUint8Array("--__");
  assert.deepEqual(Array.from(result), [251, 239, 255]);
});
