import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { WateringSchedule } from "../../watering/domain/watering.ts";

export const DASHBOARD_ALERT_WINDOW_DAYS = 7;
export const MAX_DASHBOARD_ALERTS = 5;

export type DashboardAlertUrgency = "overdue" | "today" | "upcoming";
export type DashboardAlertSource = "task" | "watering";

export interface DashboardAlert {
  id: string;
  source: DashboardAlertSource;
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

export interface DashboardAlertSources {
  tasks: readonly CultivationTask[];
  wateringSchedules: readonly WateringSchedule[];
  crops: readonly { id: string; name: string }[];
}

export class InvalidDashboardAlertDateError extends Error {
  constructor(value: string) {
    super(`알림 날짜가 올바르지 않습니다: ${value}`);
    this.name = "InvalidDashboardAlertDateError";
  }
}

export class MissingDashboardAlertCropError extends Error {
  constructor(cropId: string) {
    super(`물주기 일정의 작물 기준정보를 찾을 수 없습니다: ${cropId}`);
    this.name = "MissingDashboardAlertCropError";
  }
}

export function formatLocalDateOnly(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new InvalidDashboardAlertDateError(String(date));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDashboardAlerts(
  sources: DashboardAlertSources,
  today: string,
): DashboardAlertSummary {
  const todayTimestamp = parseDateOnly(today);
  if (todayTimestamp === null) throw new InvalidDashboardAlertDateError(today);
  const cropsById = new Map(sources.crops.map((crop) => [crop.id, crop]));

  const taskAlerts = sources.tasks
    .filter((task) => task.status === "pending")
    .map((task) => taskToAlert(task, todayTimestamp));
  const wateringAlerts = sources.wateringSchedules
    .filter((schedule) => schedule.enabled)
    .map((schedule) => wateringToAlert(schedule, cropsById, todayTimestamp));
  const candidates = [...taskAlerts, ...wateringAlerts]
    .filter((alert) => alert.daysFromToday <= DASHBOARD_ALERT_WINDOW_DAYS)
    .sort(compareAlerts);

  return {
    alerts: candidates.slice(0, MAX_DASHBOARD_ALERTS),
    overdueCount: candidates.filter((alert) => alert.urgency === "overdue").length,
    todayCount: candidates.filter((alert) => alert.urgency === "today").length,
    upcomingCount: candidates.filter((alert) => alert.urgency === "upcoming").length,
    totalCount: candidates.length,
  };
}

function taskToAlert(task: CultivationTask, todayTimestamp: number): DashboardAlert {
  const dueTimestamp = parseDateOnly(task.dueDate);
  if (dueTimestamp === null) throw new InvalidDashboardAlertDateError(task.dueDate);
  return createAlert({
    id: task.id,
    source: "task",
    seasonId: task.seasonId,
    title: task.title,
    dueDate: task.dueDate,
    href: `/seasons/${task.seasonId}/tasks`,
  }, dueTimestamp, todayTimestamp);
}

function wateringToAlert(
  schedule: WateringSchedule,
  cropsById: ReadonlyMap<string, { id: string; name: string }>,
  todayTimestamp: number,
): DashboardAlert {
  const crop = cropsById.get(schedule.cropId);
  if (!crop) throw new MissingDashboardAlertCropError(schedule.cropId);
  const dueDate = formatLocalDateOnly(new Date(schedule.nextWateringAt));
  const dueTimestamp = parseDateOnly(dueDate);
  if (dueTimestamp === null) throw new InvalidDashboardAlertDateError(schedule.nextWateringAt);

  return createAlert({
    id: schedule.id,
    source: "watering",
    seasonId: schedule.seasonId,
    title: `${crop.name} 물주기`,
    dueDate,
    href: `/seasons/${schedule.seasonId}/watering`,
  }, dueTimestamp, todayTimestamp);
}

function createAlert(
  input: Pick<DashboardAlert, "id" | "source" | "seasonId" | "title" | "dueDate" | "href">,
  dueTimestamp: number,
  todayTimestamp: number,
): DashboardAlert {
  const daysFromToday = Math.round((dueTimestamp - todayTimestamp) / 86_400_000);
  return { ...input, urgency: getUrgency(daysFromToday), daysFromToday };
}

function getUrgency(daysFromToday: number): DashboardAlertUrgency {
  if (daysFromToday < 0) return "overdue";
  if (daysFromToday === 0) return "today";
  return "upcoming";
}

function compareAlerts(left: DashboardAlert, right: DashboardAlert): number {
  const urgencyOrder: Record<DashboardAlertUrgency, number> = { overdue: 0, today: 1, upcoming: 2 };
  return urgencyOrder[left.urgency] - urgencyOrder[right.urgency]
    || left.dueDate.localeCompare(right.dueDate)
    || left.source.localeCompare(right.source)
    || left.title.localeCompare(right.title, "ko-KR");
}

function parseDateOnly(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}
