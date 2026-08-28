import assert from "node:assert/strict";
import test from "node:test";
import { estimateSunlight } from "./sunlight-estimate.ts";

const summer = new Date("2026-06-21T00:00:00Z");

test("서울의 남향 공간은 북향보다 예상 직사광 시간이 길다", () => {
  const south = estimateSunlight(37.5665, "south", summer);
  const north = estimateSunlight(37.5665, "north", summer);

  assert.equal(south.hours > north.hours, true);
  assert.equal(south.exposure, "full");
  assert.equal(north.exposure, "partial");
});

test("사방이 트인 야외 공간은 긴 여름 일조 시간을 반영한다", () => {
  const estimate = estimateSunlight(37.5665, "open", summer);
  assert.equal(estimate.hours >= 10, true);
  assert.equal(estimate.exposure, "full");
});

test("잘못된 위도를 거부한다", () => {
  assert.throws(() => estimateSunlight(91, "south"), /위도/);
});
