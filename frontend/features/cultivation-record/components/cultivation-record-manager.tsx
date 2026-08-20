"use client";

import { useState } from "react";
import { useGrowingSeasons } from "../../growing-season/hooks/use-growing-seasons";
import { useSeasonSummary } from "../../growing-season/hooks/use-season-summary";
import { useGrowingSpaces } from "../../growing-space/hooks/use-growing-spaces";
import {
  type CultivationRecord,
  type CultivationRecordInput,
} from "../domain/cultivation-record";
import { useCultivationRecords } from "../hooks/use-cultivation-records";
import {
  createCultivationRecord,
  deleteCultivationRecord,
  deleteCultivationRecordPhoto,
  updateCultivationRecord,
  uploadCultivationRecordPhoto,
} from "../infrastructure/cultivation-record-api";
import {
  CultivationRecordLoadError,
  CultivationRecordLoadingState,
  CultivationRecordWorkspace,
  type RecordFilter,
} from "./cultivation-record-workspace";

export function CultivationRecordManager({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const recordsState = useCultivationRecords(seasonId);
  const seasonSummary = useSeasonSummary(seasonId);
  const [filter, setFilter] = useState<RecordFilter>("all");
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [actionError, setActionError] = useState("");

  if (seasonsState.status === "error") return <CultivationRecordLoadError message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <CultivationRecordLoadError message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (recordsState.status === "error") return <CultivationRecordLoadError message={recordsState.message} onRetry={() => void recordsState.reload()} />;
  if (seasonsState.status === "loading" || spacesState.status === "loading" || recordsState.status === "loading") {
    return <CultivationRecordLoadingState />;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <CultivationRecordLoadError message="재배 시즌을 찾을 수 없습니다." />;
  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <CultivationRecordLoadError message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;

  async function runAction(key: string, action: () => Promise<void>): Promise<boolean> {
    setBusyKey(key);
    setActionError("");
    try {
      await action();
      await Promise.all([recordsState.reload(), seasonSummary.reload()]);
      return true;
    } catch (error) {
      setActionError(toMessage(error));
      return false;
    } finally {
      setBusyKey("");
    }
  }

  async function create(input: CultivationRecordInput): Promise<boolean> {
    return runAction("create", async () => { await createCultivationRecord(seasonId, input); });
  }

  async function update(record: CultivationRecord, input: CultivationRecordInput): Promise<boolean> {
    const saved = await runAction(record.id, async () => { await updateCultivationRecord(record, input); });
    if (saved) setEditingId("");
    return saved;
  }

  async function uploadPhoto(record: CultivationRecord, photo: File): Promise<boolean> {
    return runAction(record.id, async () => { await uploadCultivationRecordPhoto(record, photo); });
  }

  async function removePhoto(record: CultivationRecord): Promise<void> {
    await runAction(record.id, async () => { await deleteCultivationRecordPhoto(record); });
  }

  async function remove(record: CultivationRecord): Promise<void> {
    const removed = await runAction(record.id, async () => { await deleteCultivationRecord(record); });
    if (removed) setDeletingId("");
  }

  return (
    <CultivationRecordWorkspace
      actionError={actionError}
      busy={busyKey !== ""}
      deletingId={deletingId}
      editingId={editingId}
      filter={filter}
      onCancelEdit={() => setEditingId("")}
      onCancelDelete={() => setDeletingId("")}
      onCreate={create}
      onDelete={remove}
      onDeleteRequest={setDeletingId}
      onEdit={setEditingId}
      onFilterChange={setFilter}
      onPhotoRemove={removePhoto}
      onPhotoUpload={uploadPhoto}
      onUpdate={update}
      records={recordsState.records}
      season={season}
      space={space}
    />
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "시즌 기록 요청을 처리하지 못했습니다.";
}
