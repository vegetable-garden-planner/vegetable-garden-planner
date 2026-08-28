export const CULTIVATION_TASK_TYPES = [
  "watering",
  "sowing",
  "transplanting",
  "fertilizing",
  "support",
  "harvest",
  "other",
] as const;

export type CultivationTaskType = (typeof CULTIVATION_TASK_TYPES)[number];
export type CultivationTaskStatus = "pending" | "completed";

export interface CultivationTask {
  id: string;
  seasonId: string;
  cropId: string | null;
  type: CultivationTaskType;
  title: string;
  dueDate: string;
  notes: string;
  status: CultivationTaskStatus;
  completedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
