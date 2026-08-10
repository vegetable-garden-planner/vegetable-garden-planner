import assert from "node:assert/strict";
import test from "node:test";
import {
  completeWatering,
  createWateringSchedule,
  getWateringScheduleStatus,
  InvalidWateringDataError,
  reopenWatering,
  selectWateringRule,
  setWateringScheduleEnabled,
  snoozeWatering,
  type WateringRule,
} from "./watering.ts";

const rules: readonly WateringRule[] = [
  {
    cropId: "tomato",
    growthStage: "default",
    intervalDays: 3,
    guideText: "겉흙이 마르면 충분히 물을 줍니다.",
  },
  {
    cropId: "tomato",
    growthStage: "fruiting",
    intervalDays: 2,
    guideText: "열매가 달리면 수분 상태를 자주 확인합니다.",
  },
];

test("생육 단계 규칙을 우선하고 없으면 기본 규칙을 사용한다", () => {
  assert.equal(selectWateringRule(rules, "tomato", "fruiting").intervalDays, 2);
  assert.equal(selectWateringRule(rules, "tomato", "seedling").intervalDays, 3);
  assert.throws(
    () => selectWateringRule(rules, "lettuce", "default"),
    InvalidWateringDataError,
  );
  assert.throws(
    () => selectWateringRule([...rules, { ...rules[0]! }], "tomato", "seedling"),
    /중복/,
  );
});

test("선택된 규칙으로 첫 물주기 일정을 만든다", () => {
  const schedule = createSchedule();

  assert.deepEqual(schedule, {
    id: "schedule-1",
    plantingId: "planting-1",
    intervalDays: 2,
    nextWateringAt: "2026-08-10T00:00:00.000Z",
    enabled: true,
    updatedAt: "2026-08-07T00:00:00.000Z",
  });
});

test("예정일 전·당일·이후와 비활성 상태를 구분한다", () => {
  const schedule = createSchedule();

  assert.equal(
    getWateringScheduleStatus(schedule, "2026-08-09T14:59:59.000Z"),
    "upcoming",
  );
  assert.equal(
    getWateringScheduleStatus(schedule, "2026-08-10T14:59:59.000Z"),
    "due",
  );
  assert.equal(
    getWateringScheduleStatus(schedule, "2026-08-10T15:00:00.000Z"),
    "overdue",
  );
  assert.equal(
    getWateringScheduleStatus(
      setWateringScheduleEnabled(
        schedule,
        false,
        "2026-08-09T00:00:00.000Z",
      ),
      "2026-08-11T00:00:00.000Z",
    ),
    "disabled",
  );
});

test("한국 날짜를 기준으로 물주기 당일 상태를 계산한다", () => {
  const schedule = {
    ...createSchedule(),
    nextWateringAt: "2026-08-07T14:00:00.000Z",
  };

  assert.equal(
    getWateringScheduleStatus(schedule, "2026-08-06T16:00:00.000Z"),
    "due",
  );
  assert.equal(
    getWateringScheduleStatus(schedule, "2026-08-06T16:00:00.000Z", "UTC"),
    "upcoming",
  );
  assert.throws(
    () => getWateringScheduleStatus(
      schedule,
      "2026-08-06T16:00:00.000Z",
      "Invalid/TimeZone",
    ),
    /시간대/,
  );
});

test("물주기를 완료하면 기록을 만들고 실제 완료 시각부터 다음 주기를 계산한다", () => {
  const result = completeWatering(createSchedule(), {
    id: "log-1",
    userId: "user-1",
    wateredAt: "2026-08-11T09:30:00.000Z",
    amountMl: 500,
    memo: "  흙 상태 확인 후 물주기  ",
  });

  assert.equal(result.log.scheduledFor, "2026-08-10T00:00:00.000Z");
  assert.equal(result.log.memo, "흙 상태 확인 후 물주기");
  assert.equal(result.schedule.nextWateringAt, "2026-08-13T09:30:00.000Z");
});

test("완료를 취소하면 기록에 남긴 원래 예정일로 복원한다", () => {
  const original = createSchedule();
  const completed = completeWatering(original, {
    id: "log-1",
    userId: "user-1",
    wateredAt: "2026-08-11T09:30:00.000Z",
    memo: "완료",
  });

  const reopened = reopenWatering(
    completed.schedule,
    completed.log,
    "2026-08-11T10:00:00.000Z",
  );

  assert.equal(reopened.nextWateringAt, original.nextWateringAt);
  assert.equal(reopened.updatedAt, "2026-08-11T10:00:00.000Z");
});

test("물주기를 연기하면 원래 예정일을 남기고 새 예정일로 바꾼다", () => {
  const result = snoozeWatering(createSchedule(), {
    id: "snooze-1",
    snoozedUntil: "2026-08-11T08:00:00.000Z",
    updatedAt: "2026-08-09T12:00:00.000Z",
  });

  assert.equal(result.snooze.originalDate, "2026-08-10T00:00:00.000Z");
  assert.equal(result.snooze.snoozedUntil, "2026-08-11T08:00:00.000Z");
  assert.equal(result.schedule.nextWateringAt, "2026-08-11T08:00:00.000Z");
});

test("잘못된 완료 값, 앞당기는 연기와 비활성 일정 완료를 거부한다", () => {
  const schedule = createSchedule();
  const disabled = setWateringScheduleEnabled(
    schedule,
    false,
    "2026-08-09T00:00:00.000Z",
  );

  assert.throws(() => completeWatering(schedule, {
    id: "log-1",
    userId: "user-1",
    wateredAt: "invalid",
    amountMl: 0,
    memo: "",
  }), InvalidWateringDataError);
  assert.throws(() => completeWatering(disabled, {
    id: "log-1",
    userId: "user-1",
    wateredAt: "2026-08-10T00:00:00.000Z",
    memo: "",
  }), /비활성화/);
  assert.throws(() => snoozeWatering(schedule, {
    id: "snooze-1",
    snoozedUntil: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  }), /현재 예정 시각보다 늦어야/);
});

function createSchedule() {
  return createWateringSchedule({
    id: "schedule-1",
    plantingId: "planting-1",
    cropId: "tomato",
    growthStage: "fruiting",
    firstWateringAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
  }, rules);
}
