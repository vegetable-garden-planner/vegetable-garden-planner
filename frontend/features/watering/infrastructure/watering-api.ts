import type {
  CompleteWateringInput,
  WateringHistory,
  WateringLog,
  WateringSchedule,
  WateringScheduleInput,
  WateringScheduleUpdate,
  WateringSnooze,
} from "../domain/watering.ts";
import { apiRequest } from "../../../shared/infrastructure/api-client.ts";

interface ItemResponse<T> { data: T }
interface ListResponse<T> { data: T[] }
interface CompletionResponse { data: { schedule: WateringSchedule; log: WateringLog } }
interface SnoozeResponse { data: { schedule: WateringSchedule; snooze: WateringSnooze } }

export async function fetchSeasonWateringSchedules(seasonId: string): Promise<WateringSchedule[]> {
  return (await apiRequest<ListResponse<WateringSchedule>>(
    `${seasonPath(seasonId)}/watering-schedules?perPage=100`,
  )).data;
}

export async function createWateringSchedule(
  seasonId: string,
  input: WateringScheduleInput,
): Promise<WateringSchedule> {
  return (await apiRequest<ItemResponse<WateringSchedule>>(`${seasonPath(seasonId)}/watering-schedules`, {
    method: "POST",
    body: JSON.stringify(input),
  })).data;
}

export async function updateWateringSchedule(
  schedule: WateringSchedule,
  update: WateringScheduleUpdate,
): Promise<WateringSchedule> {
  return (await apiRequest<ItemResponse<WateringSchedule>>(schedulePath(schedule.id), {
    method: "PATCH",
    headers: versionHeader(schedule.version),
    body: JSON.stringify(update),
  })).data;
}

export async function deleteWateringSchedule(schedule: WateringSchedule): Promise<void> {
  await apiRequest<void>(schedulePath(schedule.id), {
    method: "DELETE",
    headers: versionHeader(schedule.version),
  });
}

export async function completeWatering(
  schedule: WateringSchedule,
  input: CompleteWateringInput,
): Promise<{ schedule: WateringSchedule; log: WateringLog }> {
  return (await apiRequest<CompletionResponse>(`${schedulePath(schedule.id)}/complete`, {
    method: "POST",
    headers: versionHeader(schedule.version),
    body: JSON.stringify(input),
  })).data;
}

export async function snoozeWatering(
  schedule: WateringSchedule,
  snoozedUntil: string,
): Promise<{ schedule: WateringSchedule; snooze: WateringSnooze }> {
  return (await apiRequest<SnoozeResponse>(`${schedulePath(schedule.id)}/snoozes`, {
    method: "POST",
    headers: versionHeader(schedule.version),
    body: JSON.stringify({ snoozedUntil }),
  })).data;
}

export async function reopenWateringCompletion(
  schedule: WateringSchedule,
  log: WateringLog,
): Promise<WateringSchedule> {
  return (await apiRequest<ItemResponse<WateringSchedule>>(
    `${schedulePath(schedule.id)}/logs/${encodeURIComponent(log.id)}`,
    { method: "DELETE", headers: versionHeader(schedule.version) },
  )).data;
}

export async function fetchWateringHistory(scheduleId: string): Promise<WateringHistory> {
  const base = schedulePath(scheduleId);
  const [logs, snoozes] = await Promise.all([
    apiRequest<ListResponse<WateringLog>>(`${base}/logs?perPage=100`),
    apiRequest<ListResponse<WateringSnooze>>(`${base}/snoozes?perPage=100`),
  ]);
  return { logs: logs.data, snoozes: snoozes.data };
}

function versionHeader(version: number): Record<string, string> {
  return { "If-Match": `"${version}"` };
}

function seasonPath(seasonId: string): string {
  return `/seasons/${encodeURIComponent(seasonId)}`;
}

function schedulePath(scheduleId: string): string {
  return `/watering-schedules/${encodeURIComponent(scheduleId)}`;
}
