import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductOffering,
  isOfferingReady,
} from "./product-offering.ts";

test("무료 요금제는 지금 제공하는 핵심 관리 기능으로 구성한다", () => {
  const offering = getProductOffering("free");

  assert.equal(offering.plan.price, 0);
  assert.equal(offering.benefits.every((benefit) => benefit.availability === "available"), true);
  assert.equal(isOfferingReady(offering), true);
});

test("프로 요금제는 백엔드 의존 기능을 실제 판매 가능 상태로 표시하지 않는다", () => {
  const offering = getProductOffering("pro");

  assert.equal(offering.plan.price, 4_900);
  assert.equal(offering.benefits.some((benefit) => benefit.availability === "requires-backend"), true);
  assert.equal(isOfferingReady(offering), false);
});
