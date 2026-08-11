"use client";

import Link from "next/link";
import { useState } from "react";
import { useCropCatalog } from "../../crop-catalog/hooks/use-crop-catalog";
import { useGardenLayouts } from "../../garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons } from "../../growing-season/hooks/use-growing-seasons";
import type {
  CompleteWateringInput,
  WateringLog,
  WateringSchedule,
  WateringScheduleInput,
  WateringScheduleUpdate,
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
import { WateringCreateForm } from "./watering-create-form";
import type { WateringHistoryState } from "./watering-history";
import { WateringScheduleCard } from "./watering-schedule-card";

export function WateringManager({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const layoutsState = useGardenLayouts();
  const cropCatalog = useCropCatalog();
  const schedulesState = useWateringSchedules(seasonId);
  const [busyKey, setBusyKey] = useState("");
  const [actionError, setActionError] = useState("");
  const [histories, setHistories] = useState<Record<string, WateringHistoryState>>({});

  if (seasonsState.status === "error") return <Message message={seasonsState.message} />;
  if (layoutsState.status === "error") return <Message message={layoutsState.message} />;
  if (cropCatalog.status === "error") return <Message message={cropCatalog.message} />;
  if (cropCatalog.status === "loading" || layoutsState.status === "loading" || schedulesState.status === "loading") {
    return <p className="rounded-2xl bg-white p-5 text-muted">물주기 관리 정보를 불러오고 있습니다.</p>;
  }
  if (schedulesState.status === "error") return <Message message={schedulesState.message} />;

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="재배 시즌을 찾을 수 없습니다." />;
  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  if (!layout) {
    return (
      <EmptyState
        description="물주기 일정은 텃밭에 실제 배치한 작물을 기준으로 만듭니다. 먼저 작물 배치를 저장해 주세요."
        href={`/seasons/${seasonId}/layout`}
        label="작물 배치하러 가기"
        title="먼저 작물을 배치해 주세요"
      />
    );
  }

  const cropById = new Map(cropCatalog.crops.map((crop) => [crop.id, crop]));
  const placedCropIds = [...new Set(layout.placements.map((placement) => placement.cropId))];
  const scheduledCropIds = new Set(schedulesState.schedules.map((schedule) => schedule.cropId));
  const availableCrops = placedCropIds
    .filter((cropId) => !scheduledCropIds.has(cropId))
    .map((cropId) => cropById.get(cropId))
    .filter((crop) => crop !== undefined);

  async function runAction(
    key: string,
    action: () => Promise<void>,
    scheduleId?: string,
  ): Promise<boolean> {
    setBusyKey(key);
    setActionError("");
    try {
      await action();
      await schedulesState.reload();
      if (scheduleId && histories[scheduleId]?.status !== "closed" && histories[scheduleId] !== undefined) {
        await refreshHistory(scheduleId);
      }
      return true;
    } catch (error) {
      setActionError(toMessage(error));
      return false;
    } finally {
      setBusyKey("");
    }
  }

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

  async function create(input: WateringScheduleInput): Promise<boolean> {
    return runAction("create", async () => { await createWateringSchedule(seasonId, input); });
  }

  async function update(schedule: WateringSchedule, input: WateringScheduleUpdate): Promise<void> {
    await runAction(schedule.id, async () => { await updateWateringSchedule(schedule, input); }, schedule.id);
  }

  async function complete(schedule: WateringSchedule, input: CompleteWateringInput): Promise<boolean> {
    return runAction(schedule.id, async () => { await completeWatering(schedule, input); }, schedule.id);
  }

  async function snooze(schedule: WateringSchedule, snoozedUntil: string): Promise<void> {
    await runAction(schedule.id, async () => { await snoozeWatering(schedule, snoozedUntil); }, schedule.id);
  }

  async function remove(schedule: WateringSchedule): Promise<void> {
    if (!window.confirm(`'${cropById.get(schedule.cropId)?.name ?? schedule.cropId}' 물주기 일정을 삭제할까요?`)) return;
    await runAction(schedule.id, async () => { await deleteWateringSchedule(schedule); });
  }

  async function reopen(schedule: WateringSchedule, log: WateringLog): Promise<void> {
    if (!window.confirm("가장 최근 물주기 완료를 취소하고 이전 예정 시각으로 되돌릴까요?")) return;
    await runAction(schedule.id, async () => { await reopenWateringCompletion(schedule, log); }, schedule.id);
  }

  return (
    <div>
      <section className="rounded-3xl bg-leaf-soft/60 p-5" aria-labelledby="watering-season-title">
        <p className="text-sm font-bold text-leaf">재배 시즌</p>
        <h2 className="mt-1 text-xl font-bold" id="watering-season-title">{season.name}</h2>
        <p className="mt-2 text-sm text-muted">{season.startDate} ~ {season.endDate} · 배치 작물 {placedCropIds.length}종</p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="시즌 관리 메뉴">
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-bold text-leaf-dark" href={`/seasons/${seasonId}/layout`}>작물 배치</Link>
          <Link className="rounded-full bg-white px-4 py-2 text-xs font-bold text-leaf-dark" href={`/seasons/${seasonId}/tasks`}>재배 일정</Link>
        </nav>
      </section>

      {actionError && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{actionError}</p>}

      {placedCropIds.length === 0 ? (
        <EmptyState
          description="격자는 있지만 배치된 작물이 없습니다. 키울 작물을 하나 이상 선택해 주세요."
          href={`/seasons/${seasonId}/layout`}
          label="작물 배치하러 가기"
          title="물주기 대상 작물이 없어요"
        />
      ) : (
        <>
          {availableCrops.length > 0 ? (
            <WateringCreateForm
              crops={availableCrops}
              disabled={busyKey !== ""}
              key={availableCrops.map((crop) => crop.id).join("-")}
              onCreate={create}
              season={season}
            />
          ) : (
            <p className="mt-5 rounded-2xl bg-leaf-soft/40 p-4 text-sm font-bold text-leaf-dark">
              배치된 모든 작물에 물주기 일정이 있습니다.
            </p>
          )}

          {schedulesState.schedules.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {schedulesState.schedules.map((schedule) => (
                <WateringScheduleCard
                  crop={cropById.get(schedule.cropId)}
                  disabled={busyKey !== ""}
                  historyState={histories[schedule.id] ?? { status: "closed" }}
                  key={schedule.id}
                  onComplete={(input) => complete(schedule, input)}
                  onDelete={() => remove(schedule)}
                  onLoadHistory={() => runHistoryLoad(schedule.id)}
                  onReopen={(log) => reopen(schedule, log)}
                  onSnooze={(snoozedUntil) => snooze(schedule, snoozedUntil)}
                  onUpdate={(input) => update(schedule, input)}
                  schedule={schedule}
                  season={season}
                />
              ))}
            </ol>
          ) : (
            <EmptyState description="위 입력에서 배치 작물과 반복 간격을 선택해 첫 일정을 만들어 보세요." title="아직 물주기 일정이 없어요" />
          )}
        </>
      )}
    </div>
  );

  async function runHistoryLoad(scheduleId: string): Promise<void> {
    setActionError("");
    try {
      await refreshHistory(scheduleId);
    } catch (error) {
      setActionError(toMessage(error));
    }
  }
}

function EmptyState({
  description,
  href,
  label,
  title,
}: {
  description: string;
  href?: string;
  label?: string;
  title: string;
}) {
  return (
    <section className="mt-5 rounded-3xl border border-dashed border-leaf/30 bg-white p-7 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      {href && label && <Link className="mt-5 inline-flex rounded-full bg-leaf-soft px-5 py-3 text-sm font-bold text-leaf-dark" href={href}>{label}</Link>}
    </section>
  );
}

function Message({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 p-5 text-red-700" role="alert">
      <p className="font-semibold">{message}</p>
      <Link className="mt-4 inline-flex font-bold underline" href="/seasons">시즌 목록으로 돌아가기</Link>
    </div>
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "물주기 요청을 처리하지 못했습니다.";
}
