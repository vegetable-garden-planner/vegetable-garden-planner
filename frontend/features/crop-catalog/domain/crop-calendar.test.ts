import assert from "node:assert/strict";
import test from "node:test";
import { isYearRoundPeriod, monthsInRange } from "./crop-calendar.ts";

test("보통 범위는 시작 월부터 끝 월까지 순서대로 반환한다", () => {
  assert.deepEqual(monthsInRange({ startMonth: 3, endMonth: 6 }), [3, 4, 5, 6]);
});

test("한 달짜리 범위는 그 달 하나만 반환한다", () => {
  assert.deepEqual(monthsInRange({ startMonth: 5, endMonth: 5 }), [5]);
});

test("연말을 넘기는 범위는 12월 다음 1월로 이어서 반환한다", () => {
  assert.deepEqual(monthsInRange({ startMonth: 11, endMonth: 2 }), [11, 12, 1, 2]);
});

test("1월부터 12월까지면 연중 재배 가능으로 본다", () => {
  assert.equal(isYearRoundPeriod({ startMonth: 1, endMonth: 12 }), true);
});

test("1월부터 12월까지가 아니면 연중 재배 가능이 아니다", () => {
  assert.equal(isYearRoundPeriod({ startMonth: 3, endMonth: 6 }), false);
  assert.equal(isYearRoundPeriod({ startMonth: 11, endMonth: 2 }), false);
});
