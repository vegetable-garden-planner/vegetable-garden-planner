import type { CultivationTask } from "../domain/cultivation-task.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import { apiRequest } from "../../../shared/infrastructure/api-client.ts";

interface TaskListResponse {
  data: CultivationTask[];
}

interface TaskResponse {
  data: CultivationTask;
}

export type CultivationTaskUpdate = Partial<
  Pick<CultivationTask, "title" | "dueDate" | "notes" | "status">
>;

export async function fetchCultivationTasks(): Promise<CultivationTask[]> {
  return (await apiRequest<TaskListResponse>("/tasks?perPage=100")).data;
}

export async function generateCultivationTasks(layout: GardenLayout): Promise<CultivationTask[]> {
  return (await apiRequest<TaskListResponse>(seasonTasksPath(layout.seasonId, "/generate"), {
    method: "POST",
    headers: versionHeader(layout.version),
  })).data;
}

export async function updateCultivationTask(
  task: CultivationTask,
  update: CultivationTaskUpdate,
): Promise<CultivationTask> {
  return (await apiRequest<TaskResponse>(taskPath(task.id), {
    method: "PATCH",
    headers: versionHeader(task.version),
    body: JSON.stringify(update),
  })).data;
}

export async function deleteCultivationTask(task: CultivationTask): Promise<void> {
  await apiRequest<void>(taskPath(task.id), {
    method: "DELETE",
    headers: versionHeader(task.version),
  });
}

export async function deleteSeasonCultivationTasks(
  seasonId: string,
  tasks: readonly CultivationTask[],
): Promise<void> {
  await apiRequest<void>(seasonTasksPath(seasonId), {
    method: "DELETE",
    body: JSON.stringify({
      tasks: tasks.map(({ id, version }) => ({ id, version })),
    }),
  });
}

function versionHeader(version: number): Record<string, string> {
  return { "If-Match": `"${version}"` };
}

function taskPath(taskId: string): string {
  return `/tasks/${encodeURIComponent(taskId)}`;
}

function seasonTasksPath(seasonId: string, suffix = ""): string {
  return `/seasons/${encodeURIComponent(seasonId)}/tasks${suffix}`;
}
