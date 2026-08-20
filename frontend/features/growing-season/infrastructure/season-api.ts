import type {
  GrowingSeasonInput,
  PersistedGrowingSeason,
} from "@/features/growing-season/domain/growing-season";
import { apiRequest } from "@/shared/infrastructure/api-client";
import { invalidateResource } from "@/shared/infrastructure/resource-cache";

interface SeasonResponse { data: PersistedGrowingSeason }
interface SeasonListResponse { data: PersistedGrowingSeason[] }

export async function fetchGrowingSeasons(): Promise<PersistedGrowingSeason[]> {
  return (await apiRequest<SeasonListResponse>("/seasons?perPage=100")).data;
}

export async function createGrowingSeason(input: GrowingSeasonInput): Promise<PersistedGrowingSeason> {
  const response = await apiRequest<SeasonResponse>("/seasons", {
    method: "POST",
    body: JSON.stringify(input),
  });
  invalidateResource("seasons");

  return response.data;
}

export async function updateGrowingSeason(
  season: PersistedGrowingSeason,
  input: GrowingSeasonInput,
): Promise<PersistedGrowingSeason> {
  const response = await apiRequest<SeasonResponse>(`/seasons/${encodeURIComponent(season.id)}`, {
    method: "PATCH",
    headers: { "If-Match": `"${season.version}"` },
    body: JSON.stringify(input),
  });
  invalidateResource("seasons");

  return response.data;
}

export async function deleteGrowingSeason(season: PersistedGrowingSeason): Promise<void> {
  await apiRequest<void>(`/seasons/${encodeURIComponent(season.id)}`, {
    method: "DELETE",
    headers: { "If-Match": `"${season.version}"` },
  });
  invalidateResource("seasons");
}
