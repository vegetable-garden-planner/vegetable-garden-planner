import { apiRequest } from "@/shared/infrastructure/api-client";
import type { SpaceMemo, SpaceMemoInput } from "@/features/space-memo/domain/space-memo";

interface ItemResponse { data: SpaceMemo }
interface ListResponse { data: SpaceMemo[] }

export async function fetchSpaceMemos(spaceId: string): Promise<SpaceMemo[]> {
  return (await apiRequest<ListResponse>(`/spaces/${encodeURIComponent(spaceId)}/memos?perPage=50`)).data;
}

export async function createSpaceMemo(spaceId: string, input: SpaceMemoInput): Promise<SpaceMemo> {
  return (await apiRequest<ItemResponse>(`/spaces/${encodeURIComponent(spaceId)}/memos`, {
    method: "POST",
    body: JSON.stringify(input),
  })).data;
}

export async function deleteSpaceMemo(memo: SpaceMemo): Promise<void> {
  await apiRequest<void>(`/memos/${encodeURIComponent(memo.id)}`, {
    method: "DELETE",
    headers: { "If-Match": `"${memo.version}"` },
  });
}
