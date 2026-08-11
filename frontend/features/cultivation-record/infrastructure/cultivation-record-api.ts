import { apiRequest } from "../../../shared/infrastructure/api-client.ts";
import type {
  CultivationRecord,
  CultivationRecordInput,
  CultivationRecordType,
} from "../domain/cultivation-record.ts";

interface ItemResponse { data: CultivationRecord }
interface ListResponse { data: CultivationRecord[] }

export async function fetchSeasonRecords(
  seasonId: string,
  type?: CultivationRecordType,
): Promise<CultivationRecord[]> {
  const query = type ? `?perPage=100&type=${type}` : "?perPage=100";
  return (await apiRequest<ListResponse>(`${seasonPath(seasonId)}/records${query}`)).data;
}

export async function createCultivationRecord(
  seasonId: string,
  input: CultivationRecordInput,
): Promise<CultivationRecord> {
  return (await apiRequest<ItemResponse>(`${seasonPath(seasonId)}/records`, {
    method: "POST",
    body: JSON.stringify(input),
  })).data;
}

export async function updateCultivationRecord(
  record: CultivationRecord,
  input: CultivationRecordInput,
): Promise<CultivationRecord> {
  return (await apiRequest<ItemResponse>(recordPath(record.id), {
    method: "PATCH",
    headers: versionHeader(record.version),
    body: JSON.stringify(input),
  })).data;
}

export async function deleteCultivationRecord(record: CultivationRecord): Promise<void> {
  await apiRequest<void>(recordPath(record.id), {
    method: "DELETE",
    headers: versionHeader(record.version),
  });
}

function versionHeader(version: number): Record<string, string> {
  return { "If-Match": `"${version}"` };
}

function seasonPath(seasonId: string): string {
  return `/seasons/${encodeURIComponent(seasonId)}`;
}

function recordPath(recordId: string): string {
  return `/records/${encodeURIComponent(recordId)}`;
}
