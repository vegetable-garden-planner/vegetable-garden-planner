import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import { apiGetList, apiRequest } from "@/shared/infrastructure/api-client";
import { notifyApiDataChanged } from "@/shared/infrastructure/api-resource-store";

export const listGardenLayouts = () => apiGetList<GardenLayout>("/layouts");

export async function saveGardenLayoutOnServer(layout: GardenLayout) {
  const response = await apiRequest<{ data: GardenLayout }>(`/seasons/${layout.seasonId}/layout`, {
    method: "PUT",
    headers: layout.version ? { "If-Match": `"${layout.version}"` } : undefined,
    body: JSON.stringify({
      spaceWidthCm: layout.spaceWidthCm,
      spaceLengthCm: layout.spaceLengthCm,
      cellSizeCm: layout.cellSizeCm,
      placements: layout.placements,
    }),
  });
  notifyApiDataChanged();
  return response.data;
}

export async function deleteGardenLayoutOnServer(layout: GardenLayout) {
  await apiRequest<void>(`/seasons/${layout.seasonId}/layout`, {
    method: "DELETE",
    headers: layout.version ? { "If-Match": `"${layout.version}"` } : undefined,
  });
  notifyApiDataChanged();
}
