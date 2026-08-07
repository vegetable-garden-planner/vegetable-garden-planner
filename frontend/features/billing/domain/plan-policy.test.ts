import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePlanLimit,
  findPlanPolicy,
  PLAN_POLICIES,
  type PlanPolicy,
} from "./plan-policy.ts";

test("Free와 Pro 요금제 정책을 코드로 찾는다", () => {
  assert.equal(findPlanPolicy("free")?.price, 0);
  assert.equal(findPlanPolicy("pro")?.price, 4_900);
  assert.equal(findPlanPolicy("unknown"), undefined);
  assert.equal(PLAN_POLICIES.length, 2);
});

test("Free 요금제는 남은 텃밭 한도 안에서만 추가를 허용한다", () => {
  const free = requirePlan("free");

  assert.deepEqual(evaluatePlanLimit(free, "max_gardens", 0), {
    allowed: true,
    code: "allowed",
    featureKey: "max_gardens",
    limit: 1,
    remaining: 0,
  });
  assert.deepEqual(evaluatePlanLimit(free, "max_gardens", 1), {
    allowed: false,
    code: "limit-exceeded",
    featureKey: "max_gardens",
    limit: 1,
    remaining: 0,
  });
});

test("여러 건 요청은 모두 수용할 수 있을 때만 허용한다", () => {
  const free = requirePlan("free");

  assert.equal(evaluatePlanLimit(free, "max_seasons", 0, 2).allowed, true);
  assert.equal(evaluatePlanLimit(free, "max_seasons", 1, 2).allowed, false);
});

test("Pro의 무제한 기능은 현재 사용량과 관계없이 허용한다", () => {
  const pro = requirePlan("pro");
  const decision = evaluatePlanLimit(pro, "max_gardens", 10_000, 100);

  assert.equal(decision.allowed, true);
  assert.equal(decision.limit, null);
  assert.equal(decision.remaining, null);
});

test("비활성 기능과 비활성 요금제는 거부한다", () => {
  const free = requirePlan("free");
  const inactive = { ...free, active: false };

  assert.equal(evaluatePlanLimit(free, "pdf_export", 0).code, "feature-disabled");
  assert.equal(evaluatePlanLimit(inactive, "max_gardens", 0).code, "plan-inactive");
});

test("잘못된 사용량과 요청량은 판정하지 않는다", () => {
  const free = requirePlan("free");

  assert.throws(() => evaluatePlanLimit(free, "max_gardens", -1), RangeError);
  assert.throws(() => evaluatePlanLimit(free, "max_gardens", 0, 0), RangeError);
  assert.throws(() => evaluatePlanLimit(free, "max_gardens", 0.5), RangeError);
});

function requirePlan(code: "free" | "pro"): PlanPolicy {
  const plan = findPlanPolicy(code);
  assert.ok(plan);
  return plan;
}
