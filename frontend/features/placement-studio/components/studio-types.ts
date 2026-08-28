import type { RecommendedCell } from "@/features/placement-studio/domain/validation";

/** 왼쪽 도구 막대 (프로토타입의 rail) */
export const STUDIO_TOOLS = ["select", "crop", "planter", "group", "note", "journal", "layers"] as const;
export type StudioTool = (typeof STUDIO_TOOLS)[number];

export const TOOL_LABELS: Record<StudioTool, string> = {
  select: "선택",
  crop: "작물",
  planter: "화분",
  group: "그룹",
  note: "메모",
  journal: "재배기록",
  layers: "레이어",
};

export type SelectionType = "planter" | "crop" | "group" | "note" | "journal" | null;

export interface Selection {
  type: SelectionType;
  ids: string[];
}

export const NO_SELECTION: Selection = { type: null, ids: [] };

export interface RecommendationState {
  cropId: string;
  sourceId: string;
  cells: RecommendedCell[];
}
