import type { CultivationTask } from "@/features/cultivation-schedule/domain/cultivation-task";
import { apiGetList, apiRequest } from "@/shared/infrastructure/api-client";
import { notifyApiDataChanged } from "@/shared/infrastructure/api-resource-store";

export const listCultivationTasks = () => apiGetList<CultivationTask>("/tasks");

export async function replaceSeasonCultivationTasks(
  seasonId: string,
  tasks: readonly CultivationTask[],
) {
  const response = await apiRequest<{ data: CultivationTask[] }>(`/seasons/${seasonId}/tasks`, {
    method: "PUT",
    body: JSON.stringify({
      tasks: tasks.map((task) => ({
        cropId: task.cropId,
        type: task.type,
        title: task.title,
        dueDate: task.dueDate,
        notes: task.notes,
        status: task.status,
      })),
    }),
  });
  notifyApiDataChanged();
  return response.data;
}

export async function updateCultivationTaskOnServer(
  task: CultivationTask,
  patch: Partial<Pick<CultivationTask, "title" | "dueDate" | "notes" | "status">>,
) {
  const response = await apiRequest<{ data: CultivationTask }>(`/tasks/${task.id}`, {
    method: "PATCH",
    headers: task.version ? { "If-Match": `"${task.version}"` } : undefined,
    body: JSON.stringify(patch),
  });
  notifyApiDataChanged();
  return response.data;
}
