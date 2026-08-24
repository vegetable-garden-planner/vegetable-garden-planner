import { apiRequest } from "../../../shared/infrastructure/api-client.ts";
import { invalidateResource } from "../../../shared/infrastructure/resource-cache.ts";
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

export async function fetchAllRecords(): Promise<CultivationRecord[]> {
  return (await apiRequest<ListResponse>("/records?perPage=100")).data;
}

export async function createCultivationRecord(
  seasonId: string,
  input: CultivationRecordInput,
): Promise<CultivationRecord> {
  const record = (await apiRequest<ItemResponse>(`${seasonPath(seasonId)}/records`, {
    method: "POST",
    body: JSON.stringify(input),
  })).data;
  invalidateResource("records");

  return record;
}

export async function updateCultivationRecord(
  record: CultivationRecord,
  input: CultivationRecordInput,
): Promise<CultivationRecord> {
  const updated = (await apiRequest<ItemResponse>(recordPath(record.id), {
    method: "PATCH",
    headers: versionHeader(record.version),
    body: JSON.stringify(input),
  })).data;
  invalidateResource("records");

  return updated;
}

export async function uploadCultivationRecordPhoto(
  record: CultivationRecord,
  photo: File,
): Promise<CultivationRecord> {
  const body = new FormData();
  body.append("photo", photo);
  return (await apiRequest<ItemResponse>(`${recordPath(record.id)}/photo`, {
    method: "POST",
    headers: versionHeader(record.version),
    body,
  })).data;
}

export async function deleteCultivationRecordPhoto(
  record: CultivationRecord,
): Promise<CultivationRecord> {
  return (await apiRequest<ItemResponse>(`${recordPath(record.id)}/photo`, {
    method: "DELETE",
    headers: versionHeader(record.version),
  })).data;
}

export async function deleteCultivationRecord(record: CultivationRecord): Promise<void> {
  await apiRequest<void>(recordPath(record.id), {
    method: "DELETE",
    headers: versionHeader(record.version),
  });
  invalidateResource("records");
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
