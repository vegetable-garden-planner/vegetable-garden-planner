import type { GardenLayout } from "../domain/garden-layout.ts";
import { apiRequest } from "../../../shared/infrastructure/api-client.ts";
import { invalidateResource } from "../../../shared/infrastructure/resource-cache.ts";

interface GardenLayoutResponse {
  data: GardenLayout;
}

interface GardenLayoutListResponse {
  data: GardenLayout[];
}

type GardenLayoutInput = Pick<
  GardenLayout,
  "spaceWidthCm" | "spaceLengthCm" | "cellSizeCm" | "placements"
>;

export async function fetchGardenLayouts(): Promise<GardenLayout[]> {
  return (await apiRequest<GardenLayoutListResponse>("/layouts?perPage=100")).data;
}

export async function putGardenLayout(layout: GardenLayout): Promise<GardenLayout> {
  const headers = layout.version > 0
    ? { "If-Match": `"${layout.version}"` }
    : undefined;

  const result = (await apiRequest<GardenLayoutResponse>(layoutPath(layout.seasonId), {
    method: "PUT",
    headers,
    body: JSON.stringify(toInput(layout)),
  })).data;
  invalidateResource("layouts");
  return result;
}

export async function deleteGardenLayout(layout: GardenLayout): Promise<void> {
  await apiRequest<void>(layoutPath(layout.seasonId), {
    method: "DELETE",
    headers: { "If-Match": `"${layout.version}"` },
  });
  invalidateResource("layouts");
}

function toInput(layout: GardenLayout): GardenLayoutInput {
  return {
    spaceWidthCm: layout.spaceWidthCm,
    spaceLengthCm: layout.spaceLengthCm,
    cellSizeCm: layout.cellSizeCm,
    placements: layout.placements,
  };
}

function layoutPath(seasonId: string): string {
  return `/seasons/${encodeURIComponent(seasonId)}/layout`;
}
