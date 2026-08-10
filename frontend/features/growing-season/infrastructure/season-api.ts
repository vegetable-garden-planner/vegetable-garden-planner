import type { GrowingSeason, GrowingSeasonInput } from "@/features/growing-season/domain/growing-season";
import { apiGetList, apiRequest } from "@/shared/infrastructure/api-client";
import { notifyApiDataChanged } from "@/shared/infrastructure/api-resource-store";

export const listGrowingSeasons = () => apiGetList<GrowingSeason>("/seasons");

export async function createGrowingSeasonOnServer(input: GrowingSeasonInput) {
  const season = await mutate<GrowingSeason>("/seasons", "POST", input);
  notifyApiDataChanged();
  return season;
}

export async function updateGrowingSeasonOnServer(season: GrowingSeason, input: GrowingSeasonInput) {
  const updated = await mutate<GrowingSeason>(`/seasons/${season.id}`, "PATCH", input, season.version);
  notifyApiDataChanged();
  return updated;
}

export async function deleteGrowingSeasonOnServer(season: GrowingSeason) {
  await apiRequest<void>(`/seasons/${season.id}`, {
    method: "DELETE",
    headers: season.version ? { "If-Match": `"${season.version}"` } : undefined,
  });
  notifyApiDataChanged();
}

async function mutate<T>(path: string, method: string, body: unknown, version?: number) {
  const response = await apiRequest<{ data: T }>(path, {
    method,
    headers: version ? { "If-Match": `"${version}"` } : undefined,
    body: JSON.stringify(body),
  });
  return response.data;
}
