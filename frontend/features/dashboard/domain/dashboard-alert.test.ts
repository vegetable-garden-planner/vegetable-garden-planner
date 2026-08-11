import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import {
  createDashboardAlerts,
  formatLocalDateOnly,
  InvalidDashboardAlertDateError,
  MAX_DASHBOARD_ALERTS,
} from "./dashboard-alert.ts";

test("UTC 변환 없이 브라우저 현지 날짜를 YYYY-MM-DD로 만든다", () => {
  assert.equal(formatLocalDateOnly(new Date(2026, 7, 7, 0, 30)), "2026-08-07");
  assert.throws(
    () => formatLocalDateOnly(new Date("invalid")),
    InvalidDashboardAlertDateError,
  );
});

test("미완료 일정을 기한 지남, 오늘, 7일 이내 순으로 분류한다", () => {
  const summary = createDashboardAlerts([
    createTask("upcoming", "2026-08-12"),
    createTask("overdue", "2026-08-05"),
    createTask("today", "2026-08-07"),
    createTask("later", "2026-08-15"),
  ], "2026-08-07");

  assert.deepEqual(
    summary.alerts.map(({ taskId, urgency, daysFromToday }) => ({
      taskId,
      urgency,
      daysFromToday,
    })),
    [
      { taskId: "overdue", urgency: "overdue", daysFromToday: -2 },
      { taskId: "today", urgency: "today", daysFromToday: 0 },
      { taskId: "upcoming", urgency: "upcoming", daysFromToday: 5 },
    ],
  );
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.todayCount, 1);
  assert.equal(summary.upcomingCount, 1);
  assert.equal(summary.totalCount, 3);
});

test("완료 일정과 7일 뒤보다 먼 일정은 알림에서 제외한다", () => {
  const completed = { ...createTask("completed", "2026-08-07"), status: "completed" as const };
  const summary = createDashboardAlerts([
    completed,
    createTask("boundary", "2026-08-14"),
    createTask("outside", "2026-08-15"),
  ], "2026-08-07");

  assert.deepEqual(summary.alerts.map((alert) => alert.taskId), ["boundary"]);
});

test("전체 개수는 유지하면서 화면에는 최대 다섯 개만 표시한다", () => {
  const tasks = Array.from({ length: MAX_DASHBOARD_ALERTS + 2 }, (_, index) =>
    createTask(`task-${index}`, "2026-08-08"),
  );

  const summary = createDashboardAlerts(tasks, "2026-08-07");

  assert.equal(summary.alerts.length, MAX_DASHBOARD_ALERTS);
  assert.equal(summary.totalCount, MAX_DASHBOARD_ALERTS + 2);
});

test("알림은 해당 시즌의 일정 화면으로 연결한다", () => {
  const summary = createDashboardAlerts(
    [createTask("task", "2026-08-07", "season-special")],
    "2026-08-07",
  );

  assert.equal(summary.alerts[0]?.href, "/seasons/season-special/tasks");
});

test("존재하지 않는 오늘 날짜와 일정 날짜를 거부한다", () => {
  assert.throws(
    () => createDashboardAlerts([], "2026-02-30"),
    InvalidDashboardAlertDateError,
  );
  assert.throws(
    () => createDashboardAlerts([createTask("task", "invalid")], "2026-08-07"),
    InvalidDashboardAlertDateError,
  );
});

function createTask(
  id: string,
  dueDate: string,
  seasonId = "season-1",
): CultivationTask {
  return {
    id,
    seasonId,
    cropId: "lettuce",
    type: "transplanting",
    title: `${id} 일정`,
    dueDate,
    notes: "",
    status: "pending",
    completedAt: null,
    version: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}
