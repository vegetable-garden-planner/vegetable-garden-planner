import type {
  ContainerPlacementInput,
  ContainerPlacementListItem,
  ContainerPlacements,
} from "../domain/container-placement.ts";
import { apiRequest } from "../../../shared/infrastructure/api-client.ts";

interface ContainerPlacementsResponse {
  data: ContainerPlacements;
}

interface ContainerPlacementListResponse {
  data: ContainerPlacementListItem[];
}

export async function fetchContainerPlacements(seasonId: string): Promise<ContainerPlacements> {
  return (await apiRequest<ContainerPlacementsResponse>(placementsPath(seasonId))).data;
}

export async function fetchAllContainerPlacements(): Promise<ContainerPlacementListItem[]> {
  return (await apiRequest<ContainerPlacementListResponse>("/container-placements?perPage=100")).data;
}

export async function putContainerPlacements(
  seasonId: string,
  version: number,
  placements: readonly ContainerPlacementInput[],
): Promise<ContainerPlacements> {
  return (await apiRequest<ContainerPlacementsResponse>(placementsPath(seasonId), {
    method: "PUT",
    headers: { "If-Match": `"${version}"` },
    body: JSON.stringify({ placements }),
  })).data;
}

function placementsPath(seasonId: string): string {
  return `/seasons/${encodeURIComponent(seasonId)}/container-placements`;
}
