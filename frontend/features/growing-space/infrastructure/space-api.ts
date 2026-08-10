import type { GrowingSpace, GrowingSpaceInput } from "@/features/growing-space/domain/growing-space";
import { apiGetList, apiRequest } from "@/shared/infrastructure/api-client";
import { notifyApiDataChanged } from "@/shared/infrastructure/api-resource-store";

export const listGrowingSpaces = () => apiGetList<GrowingSpace>("/spaces");

export async function createGrowingSpaceOnServer(input: GrowingSpaceInput) {
  const space = await apiGetDataFromMutation<GrowingSpace>("/spaces", "POST", input);
  notifyApiDataChanged();
  return space;
}

export async function updateGrowingSpaceOnServer(space: GrowingSpace, input: GrowingSpaceInput) {
  const updated = await apiGetDataFromMutation<GrowingSpace>(`/spaces/${space.id}`, "PATCH", input, space.version);
  notifyApiDataChanged();
  return updated;
}

export async function deleteGrowingSpaceOnServer(space: GrowingSpace) {
  await apiRequest<void>(`/spaces/${space.id}`, {
    method: "DELETE",
    headers: space.version ? { "If-Match": `"${space.version}"` } : undefined,
  });
  notifyApiDataChanged();
}

async function apiGetDataFromMutation<T>(
  path: string,
  method: string,
  body: unknown,
  version?: number,
) {
  const response = await apiRequest<{ data: T }>(path, {
    method,
    headers: version ? { "If-Match": `"${version}"` } : undefined,
    body: JSON.stringify(body),
  });
  return response.data;
}
