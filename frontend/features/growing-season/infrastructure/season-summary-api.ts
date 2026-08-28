import type { SeasonSummary } from "@/features/growing-season/domain/season-summary";
import { apiRequest } from "@/shared/infrastructure/api-client";

interface SeasonSummaryResponse { data: SeasonSummary }

export async function fetchSeasonSummary(seasonId: string): Promise<SeasonSummary> {
  return (await apiRequest<SeasonSummaryResponse>(
    `/seasons/${encodeURIComponent(seasonId)}/summary`,
  )).data;
}
