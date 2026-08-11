import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { WateringSchedule } from "../../watering/domain/watering.ts";
import {
  createDashboardAlerts,
  formatLocalDateOnly,
  InvalidDashboardAlertDateError,
  MAX_DASHBOARD_ALERTS,
  MissingDashboardAlertCropError,
} from "./dashboard-alert.ts";

const crops = [{ id: "lettuce", name: "상추" }];

test("UTC 변환 없이 브라우저 현지 날짜를 YYYY-MM-DD로 만든다", () => {
  assert.equal(formatLocalDateOnly(new Date(2026, 7, 7, 0, 30)), "2026-08-07");
  assert.throws(() => formatLocalDateOnly(new Date("invalid")), InvalidDashboardAlertDateError);
});

test("재배 일정과 물주기를 기한 지남, 오늘, 7일 이내 순으로 합친다", () => {
  const summary = createDashboardAlerts({
    tasks: [
      createTask("upcoming", "2026-08-12"),
      createTask("overdue", "2026-08-05"),
    ],
    wateringSchedules: [
      createWateringSchedule("watering-today", localNoonIso("2026-08-07")),
      createWateringSchedule("watering-later", localNoonIso("2026-08-15")),
    ],
    crops,
  }, "2026-08-07");

  assert.deepEqual(
    summary.alerts.map(({ id, source, urgency, daysFromToday }) => ({ id, source, urgency, daysFromToday })),
    [
      { id: "overdue", source: "task", urgency: "overdue", daysFromToday: -2 },
      { id: "watering-today", source: "watering", urgency: "today", daysFromToday: 0 },
      { id: "upcoming", source: "task", urgency: "upcoming", daysFromToday: 5 },
    ],
  );
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.todayCount, 1);
  assert.equal(summary.upcomingCount, 1);
  assert.equal(summary.totalCount, 3);
});

test("완료 작업, 비활성 물주기와 7일 뒤보다 먼 일정은 제외한다", () => {
  const completed = { ...createTask("completed", "2026-08-07"), status: "completed" as const };
  const disabled = { ...createWateringSchedule("disabled", localNoonIso("2026-08-07")), enabled: false };
  const summary = createDashboardAlerts({
    tasks: [completed, createTask("boundary", "2026-08-14"), createTask("outside", "2026-08-15")],
    wateringSchedules: [disabled],
    crops,
  }, "2026-08-07");

  assert.deepEqual(summary.alerts.map((alert) => alert.id), ["boundary"]);
});

test("전체 개수는 유지하면서 화면에는 최대 다섯 개만 표시한다", () => {
  const tasks = Array.from({ length: MAX_DASHBOARD_ALERTS + 2 }, (_, index) =>
    createTask(`task-${index}`, "2026-08-08"),
  );
  const summary = createDashboardAlerts({ tasks, wateringSchedules: [], crops }, "2026-08-07");

  assert.equal(summary.alerts.length, MAX_DASHBOARD_ALERTS);
  assert.equal(summary.totalCount, MAX_DASHBOARD_ALERTS + 2);
});

test("일정 종류에 맞는 시즌 관리 화면으로 연결한다", () => {
  const summary = createDashboardAlerts({
    tasks: [createTask("task", "2026-08-07", "task-season")],
    wateringSchedules: [createWateringSchedule("watering", localNoonIso("2026-08-07"), "watering-season")],
    crops,
  }, "2026-08-07");

  assert.deepEqual(summary.alerts.map(({ source, href }) => ({ source, href })), [
    { source: "task", href: "/seasons/task-season/tasks" },
    { source: "watering", href: "/seasons/watering-season/watering" },
  ]);
});

test("잘못된 날짜와 누락된 작물 기준정보를 숨기지 않는다", () => {
  assert.throws(
    () => createDashboardAlerts({ tasks: [], wateringSchedules: [], crops }, "2026-02-30"),
    InvalidDashboardAlertDateError,
  );
  assert.throws(
    () => createDashboardAlerts({ tasks: [createTask("task", "invalid")], wateringSchedules: [], crops }, "2026-08-07"),
    InvalidDashboardAlertDateError,
  );
  assert.throws(
    () => createDashboardAlerts({
      tasks: [],
      wateringSchedules: [{ ...createWateringSchedule("watering", localNoonIso("2026-08-07")), cropId: "missing" }],
      crops,
    }, "2026-08-07"),
    MissingDashboardAlertCropError,
  );
});

function createTask(id: string, dueDate: string, seasonId = "season-1"): CultivationTask {
  return {
    id, seasonId, cropId: "lettuce", type: "transplanting", title: `${id} 일정`, dueDate,
    notes: "", status: "pending", completedAt: null, version: 1,
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function createWateringSchedule(
  id: string,
  nextWateringAt: string,
  seasonId = "season-1",
): WateringSchedule {
  return {
    id, seasonId, cropId: "lettuce", intervalDays: 3, nextWateringAt, enabled: true,
    version: 1, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function localNoonIso(date: string): string {
  return new Date(`${date}T12:00:00`).toISOString();
}
