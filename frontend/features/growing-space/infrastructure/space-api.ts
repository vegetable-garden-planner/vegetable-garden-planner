import type { GrowingSpace, GrowingSpaceInput } from "@/features/growing-space/domain/growing-space";
import { apiRequest } from "@/shared/infrastructure/api-client";

interface SpaceResponse { data: GrowingSpace }
interface SpaceListResponse { data: GrowingSpace[] }

export async function fetchGrowingSpaces(): Promise<GrowingSpace[]> {
  return (await apiRequest<SpaceListResponse>("/spaces?perPage=100")).data;
}

export async function createGrowingSpace(input: GrowingSpaceInput): Promise<GrowingSpace> {
  return (await apiRequest<SpaceResponse>("/spaces", {
    method: "POST",
    body: JSON.stringify(input),
  })).data;
}

export async function updateGrowingSpace(space: GrowingSpace, input: GrowingSpaceInput): Promise<GrowingSpace> {
  return (await apiRequest<SpaceResponse>(`/spaces/${encodeURIComponent(space.id)}`, {
    method: "PATCH",
    headers: { "If-Match": `"${space.version}"` },
    body: JSON.stringify(input),
  })).data;
}

export async function deleteGrowingSpace(space: GrowingSpace): Promise<void> {
  await apiRequest<void>(`/spaces/${encodeURIComponent(space.id)}`, {
    method: "DELETE",
    headers: { "If-Match": `"${space.version}"` },
  });
}
