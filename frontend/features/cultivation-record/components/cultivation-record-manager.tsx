"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/shared/infrastructure/api-client";
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
  const isRunningRef = useRef(false);

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
    if (isRunningRef.current) return false;
    isRunningRef.current = true;
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
      isRunningRef.current = false;
    }
  }

  async function create(input: CultivationRecordInput, photo?: File): Promise<boolean> {
    let photoFailure = "";
    const saved = await runAction("create", async () => {
      const record = await createCultivationRecord(seasonId, input);
      if (!photo) return;
      try {
        await uploadCultivationRecordPhoto(record, photo);
      } catch (error) {
        // 기록은 이미 저장됐다. 사진 실패를 기록 저장 실패처럼 보이게 하지 않는다.
        photoFailure = toMessage(error);
      }
    });

    if (photoFailure) {
      setActionError(`기록은 저장했지만 사진을 올리지 못했어요. ${photoFailure} 아래 기록에서 다시 올려 주세요.`);
    }
    return saved;
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
  // 서버가 어떤 값이 잘못됐는지 알려 주면 "입력값을 확인해 주세요" 대신 그 문장을 보여 준다.
  if (error instanceof ApiError) {
    const firstFieldMessage = Object.values(error.fields)[0]?.[0];
    if (firstFieldMessage) return firstFieldMessage;
  }
  return error instanceof Error ? error.message : "시즌 기록 요청을 처리하지 못했습니다.";
}
