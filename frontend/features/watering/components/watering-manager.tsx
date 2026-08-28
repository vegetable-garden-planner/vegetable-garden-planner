"use client";

import { useRef, useState } from "react";
import { useContainerPlacements } from "../../container-placement/hooks/use-container-placements";
import { useCropCatalog } from "../../crop-catalog/hooks/use-crop-catalog";
import { useGardenLayouts } from "../../garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons } from "../../growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "../../growing-space/hooks/use-growing-spaces";
import type {
  WateringLog,
  WateringSchedule,
} from "../domain/watering";
import { useWateringSchedules } from "../hooks/use-watering-schedules";
import {
  completeWatering,
  createWateringSchedule,
  deleteWateringSchedule,
  fetchWateringHistory,
  reopenWateringCompletion,
  snoozeWatering,
  updateWateringSchedule,
} from "../infrastructure/watering-api";
import type { WateringHistoryState } from "./watering-history";
import {
  WateringEmptyState,
  WateringLoadError,
  WateringLoadingState,
  WateringWorkspace,
} from "./watering-workspace";

export function WateringManager({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const layoutsState = useGardenLayouts();
  const containerPlacementsState = useContainerPlacements(seasonId);
  const cropCatalog = useCropCatalog();
  const schedulesState = useWateringSchedules(seasonId);
  const [busyKey, setBusyKey] = useState("");
  const [actionError, setActionError] = useState("");
  const [histories, setHistories] = useState<Record<string, WateringHistoryState>>({});
  const isRunningRef = useRef(false);

  if (seasonsState.status === "error") return <WateringLoadError message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <WateringLoadError message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (layoutsState.status === "error") return <WateringLoadError message={layoutsState.message} onRetry={() => void layoutsState.reload()} />;
  if (containerPlacementsState.status === "error") return <WateringLoadError message={containerPlacementsState.message} onRetry={() => void containerPlacementsState.reload()} />;
  if (cropCatalog.status === "error") return <WateringLoadError message={cropCatalog.message} onRetry={() => window.location.reload()} />;
  if (schedulesState.status === "error") return <WateringLoadError message={schedulesState.message} onRetry={() => void schedulesState.reload()} />;
  if (seasonsState.status === "loading"
    || spacesState.status === "loading"
    || layoutsState.status === "loading"
    || containerPlacementsState.status === "loading"
    || cropCatalog.status === "loading"
    || schedulesState.status === "loading") {
    return <WateringLoadingState />;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <WateringLoadError message="재배 계획을 찾을 수 없습니다." />;
  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <WateringLoadError message="재배 계획에 연결된 재배 공간을 찾을 수 없습니다." />;

  let placedCropIds: string[];
  if (space.type === "garden") {
    const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
    if (!layout) {
      return (
        <WateringEmptyState
          description="물주기 일정은 텃밭에 실제 배치한 작물을 기준으로 만듭니다. 먼저 격자를 만들고 작물 배치를 저장해 주세요."
          links={[{ href: `/seasons/${seasonId}/layout`, label: "작물 배치하러 가기" }]}
          title="먼저 작물을 배치해 주세요"
        />
      );
    }
    placedCropIds = [...new Set(layout.placements.map((placement) => placement.cropId))];
  } else {
    const placements = containerPlacementsState.placements.placements;
    if (placements.length === 0) {
      return (
        <WateringEmptyState
          description="물주기 일정은 화분에 실제 배치한 작물을 기준으로 만듭니다. 먼저 화분마다 작물을 배치해 주세요."
          links={[{ href: `/seasons/${seasonId}/placements`, label: "화분 배치하러 가기" }]}
          title="먼저 작물을 배치해 주세요"
        />
      );
    }
    placedCropIds = [...new Set(placements.map((placement) => placement.cropId))];
  }

  const cropById = new Map(cropCatalog.crops.map((crop) => [crop.id, crop]));
  const scheduledCropIds = new Set(schedulesState.schedules.map((schedule) => schedule.cropId));
  const availableCrops = placedCropIds
    .filter((cropId) => !scheduledCropIds.has(cropId))
    .map((cropId) => cropById.get(cropId))
    .filter((crop) => crop !== undefined);

  async function refreshHistory(scheduleId: string): Promise<void> {
    setHistories((current) => ({ ...current, [scheduleId]: { status: "loading" } }));
    try {
      const history = await fetchWateringHistory(scheduleId);
      setHistories((current) => ({ ...current, [scheduleId]: { status: "ready", history } }));
    } catch (error) {
      setHistories((current) => ({
        ...current,
        [scheduleId]: { status: "error", message: toMessage(error) },
      }));
      throw error;
    }
  }

  async function runAction(
    key: string,
    action: () => Promise<void>,
    scheduleId?: string,
  ): Promise<boolean> {
    if (isRunningRef.current) return false;
    isRunningRef.current = true;
    setBusyKey(key);
    setActionError("");
    try {
      await action();
      await schedulesState.reload();
      if (scheduleId && histories[scheduleId] && histories[scheduleId].status !== "closed") {
        await refreshHistory(scheduleId);
      }
      return true;
    } catch (error) {
      setActionError(toMessage(error));
      return false;
    } finally {
      setBusyKey("");
      isRunningRef.current = false;
    }
  }

  async function remove(schedule: WateringSchedule): Promise<void> {
    await runAction(schedule.id, async () => { await deleteWateringSchedule(schedule); });
  }

  async function reopen(schedule: WateringSchedule, log: WateringLog): Promise<void> {
    await runAction(schedule.id, async () => { await reopenWateringCompletion(schedule, log); }, schedule.id);
  }

  return (
    <WateringWorkspace
      actionError={actionError}
      availableCrops={availableCrops}
      busy={busyKey !== ""}
      crops={cropCatalog.crops}
      histories={histories}
      onCloseHistory={(scheduleId) => setHistories((current) => ({ ...current, [scheduleId]: { status: "closed" } }))}
      onComplete={(schedule, input) => runAction(schedule.id, async () => { await completeWatering(schedule, input); }, schedule.id)}
      onCreate={(input) => runAction("create", async () => { await createWateringSchedule(seasonId, input); })}
      onDelete={remove}
      onLoadHistory={async (scheduleId) => {
        setActionError("");
        try { await refreshHistory(scheduleId); } catch (error) { setActionError(toMessage(error)); }
      }}
      onReopen={reopen}
      onSnooze={(schedule, snoozedUntil) => runAction(schedule.id, async () => { await snoozeWatering(schedule, snoozedUntil); }, schedule.id)}
      onUpdate={(schedule, input) => runAction(schedule.id, async () => { await updateWateringSchedule(schedule, input); }, schedule.id)}
      placedCropCount={placedCropIds.length}
      schedules={schedulesState.schedules}
      season={season}
      space={space}
    />
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "물주기 요청을 처리하지 못했습니다.";
}
