import assert from "node:assert/strict";
import test from "node:test";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season.ts";
import {
  getWateringScheduleStatus,
  localDateTimeToOffsetIso,
  validateWateringScheduleDraft,
  type WateringSchedule,
} from "./watering.ts";

test("활성 일정의 기한 지남·오늘·예정 상태를 날짜 기준으로 계산한다", () => {
  const schedule = createSchedule();

  assert.equal(getWateringScheduleStatus(schedule, new Date("2026-05-02T00:00:00Z")), "overdue");
  assert.equal(getWateringScheduleStatus(schedule, new Date("2026-05-01T12:00:00Z")), "today");
  assert.equal(getWateringScheduleStatus(schedule, new Date("2026-04-30T12:00:00Z")), "upcoming");
  assert.equal(getWateringScheduleStatus({ ...schedule, enabled: false }, new Date()), "disabled");
});

test("일정 입력을 검증하고 브라우저 시간대 오프셋을 보존한다", () => {
  const result = validateWateringScheduleDraft({
    cropId: "lettuce",
    intervalDays: "3",
    nextWateringAtLocal: "2026-05-01T09:30",
  }, createSeason());

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.value.intervalDays, 3);
  assert.match(result.value.nextWateringAt, /^2026-05-01T09:30:00[+-]\d{2}:\d{2}$/);
  assert.equal(localDateTimeToOffsetIso("2026-05-01T09:30", -540), "2026-05-01T09:30:00+09:00");
});

test("빈 작물·간격 경계·시즌 밖 날짜·존재하지 않는 시각을 거부한다", () => {
  const result = validateWateringScheduleDraft({
    cropId: "",
    intervalDays: "366",
    nextWateringAtLocal: "2026-02-30T09:00",
  }, createSeason());

  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.deepEqual(Object.keys(result.errors).sort(), [
    "cropId",
    "intervalDays",
    "nextWateringAtLocal",
  ]);
});

test("잘못된 서버 예정 시각을 조용히 상태로 바꾸지 않는다", () => {
  assert.throws(
    () => getWateringScheduleStatus({ ...createSchedule(), nextWateringAt: "invalid" }, new Date()),
    /올바르지 않습니다/,
  );
});

function createSchedule(): WateringSchedule {
  return {
    id: "schedule-1",
    seasonId: "season-1",
    cropId: "lettuce",
    intervalDays: 3,
    nextWateringAt: "2026-05-01T09:00:00Z",
    enabled: true,
    version: 1,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  };
}

function createSeason(): PersistedGrowingSeason {
  return {
    id: "season-1",
    spaceId: "space-1",
    name: "봄 텃밭",
    startDate: "2026-03-01",
    endDate: "2026-08-31",
    notes: "",
    status: "active",
    version: 1,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  };
}
