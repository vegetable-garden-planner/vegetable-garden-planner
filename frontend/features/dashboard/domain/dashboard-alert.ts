import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";

export const DASHBOARD_ALERT_WINDOW_DAYS = 7;
export const MAX_DASHBOARD_ALERTS = 5;

export type DashboardAlertUrgency = "overdue" | "today" | "upcoming";

export interface DashboardAlert {
  taskId: string;
  seasonId: string;
  title: string;
  dueDate: string;
  urgency: DashboardAlertUrgency;
  daysFromToday: number;
  href: string;
}

export interface DashboardAlertSummary {
  alerts: DashboardAlert[];
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  totalCount: number;
}

export class InvalidDashboardAlertDateError extends Error {
  constructor(value: string) {
    super(`알림 날짜가 올바르지 않습니다: ${value}`);
    this.name = "InvalidDashboardAlertDateError";
  }
}

export function formatLocalDateOnly(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new InvalidDashboardAlertDateError(String(date));
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDashboardAlerts(
  tasks: readonly CultivationTask[],
  today: string,
): DashboardAlertSummary {
  const todayTimestamp = parseDateOnly(today);
  if (todayTimestamp === null) throw new InvalidDashboardAlertDateError(today);

  const candidates = tasks
    .filter((task) => task.status === "pending")
    .map((task) => toDashboardAlert(task, todayTimestamp))
    .filter((alert) => alert.daysFromToday <= DASHBOARD_ALERT_WINDOW_DAYS)
    .sort(compareAlerts);

  const overdueCount = candidates.filter((alert) => alert.urgency === "overdue").length;
  const todayCount = candidates.filter((alert) => alert.urgency === "today").length;
  const upcomingCount = candidates.filter((alert) => alert.urgency === "upcoming").length;

  return {
    alerts: candidates.slice(0, MAX_DASHBOARD_ALERTS),
    overdueCount,
    todayCount,
    upcomingCount,
    totalCount: candidates.length,
  };
}

function toDashboardAlert(
  task: CultivationTask,
  todayTimestamp: number,
): DashboardAlert {
  const dueTimestamp = parseDateOnly(task.dueDate);
  if (dueTimestamp === null) throw new InvalidDashboardAlertDateError(task.dueDate);

  const daysFromToday = Math.round(
    (dueTimestamp - todayTimestamp) / 86_400_000,
  );

  return {
    taskId: task.id,
    seasonId: task.seasonId,
    title: task.title,
    dueDate: task.dueDate,
    urgency: getUrgency(daysFromToday),
    daysFromToday,
    href: `/seasons/${task.seasonId}/tasks`,
  };
}

function getUrgency(daysFromToday: number): DashboardAlertUrgency {
  if (daysFromToday < 0) return "overdue";
  if (daysFromToday === 0) return "today";
  return "upcoming";
}

function compareAlerts(left: DashboardAlert, right: DashboardAlert) {
  const urgencyOrder: Record<DashboardAlertUrgency, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
  };
  return urgencyOrder[left.urgency] - urgencyOrder[right.urgency]
    || left.dueDate.localeCompare(right.dueDate)
    || left.title.localeCompare(right.title, "ko-KR");
}

function parseDateOnly(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}
