import assert from "node:assert/strict";
import test from "node:test";
import { findPlanPolicy, PLAN_POLICIES } from "./plan-policy.ts";

test("무료와 프로 요금제 정보를 코드로 찾는다", () => {
  assert.equal(findPlanPolicy("free")?.price, 0);
  assert.equal(findPlanPolicy("pro")?.price, 4_900);
  assert.equal(findPlanPolicy("unknown"), undefined);
  assert.equal(findPlanPolicy(42), undefined);
  assert.equal(PLAN_POLICIES.length, 2);
});
