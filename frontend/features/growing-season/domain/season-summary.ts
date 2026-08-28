import type { CultivationRecordType } from "@/features/cultivation-record/domain/cultivation-record";
import type { GrowingSeasonStatus } from "@/features/growing-season/domain/growing-season";

export interface SeasonHarvestTotal {
  unit: string;
  quantity: number;
}

export interface SeasonSummary {
  seasonId: string;
  status: GrowingSeasonStatus;
  recordCounts: Record<CultivationRecordType, number>;
  harvestTotals: SeasonHarvestTotal[];
  taskCompletion: {
    total: number;
    completed: number;
    /** 일정이 하나도 없으면 null입니다. */
    rate: number | null;
  };
  generatedAt: string;
}

export function formatCompletionRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

export function formatHarvestQuantity(quantity: number): string {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(quantity);
}
