"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CultivationTask,
  CultivationTaskType,
} from "@/features/cultivation-schedule/domain/cultivation-task";
import { useCultivationTasks } from "@/features/cultivation-schedule/hooks/use-cultivation-tasks";
import {
  deleteCultivationTask,
  deleteSeasonCultivationTasks,
  generateCultivationTasks,
  updateCultivationTask,
} from "@/features/cultivation-schedule/infrastructure/cultivation-task-api";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { ApiError } from "@/shared/infrastructure/api-client";

const TASK_TYPE_LABELS: Record<CultivationTaskType, string> = {
  watering: "물주기",
  sowing: "파종",
  transplanting: "모종 심기",
  fertilizing: "비료",
  support: "지지대",
  harvest: "수확",
  other: "기타",
};

const TASK_TYPE_STYLES: Record<CultivationTaskType, string> = {
  watering: "bg-sky-50 text-sky-700",
  sowing: "bg-amber-50 text-amber-800",
  transplanting: "bg-leaf-soft text-leaf-dark",
  fertilizing: "bg-orange-50 text-orange-800",
  support: "bg-violet-50 text-violet-700",
  harvest: "bg-rose-50 text-rose-700",
  other: "bg-stone-100 text-stone-700",
};

export function CultivationSchedule({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const layoutsState = useGardenLayouts();
  const tasksState = useCultivationTasks();
  const [actionError, setActionError] = useState("");
  const [actionErrorCode, setActionErrorCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (seasonsState.status === "error") return <Message message={seasonsState.message} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} />;
  if (layoutsState.status === "error") return <Message message={layoutsState.message} />;
  if (tasksState.status === "error") return <Message message={tasksState.message} />;
  if (layoutsState.status === "loading" || tasksState.status === "loading") {
    return <p className="text-muted">재배 일정을 불러오고 있습니다.</p>;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="재배 일정을 만들 시즌을 찾을 수 없습니다." />;
  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <Message message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;

  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  const tasks = tasksState.tasks
    .filter((task) => task.seasonId === seasonId)
    .sort(compareTasks);
  const scheduleIsOutdated = layout
    ? tasks.some((task) => task.updatedAt < layout.updatedAt)
    : false;

  async function runAction(action: () => Promise<void>): Promise<void> {
    setActionError("");
    setActionErrorCode("");
    setIsSaving(true);
    try {
      await action();
      await tasksState.reload();
    } catch (error) {
      setActionError(toMessage(error));
      setActionErrorCode(error instanceof ApiError ? error.code : "");
    } finally {
      setIsSaving(false);
    }
  }

  async function generate(): Promise<void> {
    if (!layout) {
      setActionError("먼저 재배 공간 격자를 만들고 작물을 배치해 주세요.");
      return;
    }
    if (tasks.length > 0 && !window.confirm("기존 일정을 현재 작물 배치 기준으로 다시 만들까요?")) {
      return;
    }
    await runAction(async () => { await generateCultivationTasks(layout); });
  }

  async function removeSchedule(): Promise<void> {
    if (!window.confirm("이 시즌의 재배 일정을 모두 삭제할까요?")) return;
    await runAction(async () => { await deleteSeasonCultivationTasks(seasonId, tasks); });
  }

  async function toggleTask(task: CultivationTask): Promise<void> {
    const status = task.status === "completed" ? "pending" : "completed";
    await runAction(async () => { await updateCultivationTask(task, { status }); });
  }

  async function removeTask(task: CultivationTask): Promise<void> {
    if (!window.confirm(`'${task.title}' 일정을 삭제할까요?`)) return;
    await runAction(async () => { await deleteCultivationTask(task); });
  }

  return (
    <div>
      <section className="rounded-3xl bg-leaf-soft/60 p-5" aria-labelledby="schedule-season-title">
        <p className="text-sm font-bold text-leaf">재배 기간</p>
        <h2 className="mt-1 text-xl font-bold" id="schedule-season-title">{season.name}</h2>
        <p className="mt-2 text-sm text-muted">{season.startDate} ~ {season.endDate}</p>
      </section>

      {!layout ? (
        <EmptySchedule
          description="자동 일정은 격자에 배치한 작물을 기준으로 만듭니다. 먼저 작물 배치를 완료해 주세요."
          href={`/seasons/${seasonId}/layout`}
          label="작물 배치하러 가기"
          title="아직 작물 배치가 없어요"
        />
      ) : layout.placements.length === 0 ? (
        <EmptySchedule
          description="격자는 만들어졌지만 배치된 작물이 없습니다. 키울 작물을 하나 이상 배치해 주세요."
          href={`/seasons/${seasonId}/layout`}
          label="작물 배치하러 가기"
          title="일정을 만들 작물이 없어요"
        />
      ) : (
        <>
          <div className="surface-panel mt-5 flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-bold">배치 작물 {new Set(layout.placements.map((item) => item.cropId)).size}종</p>
              <p className="mt-1 text-sm text-muted">심기와 수확 시작 일정을 시즌 안에서 계산합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tasks.length > 0 && (
                <button
                  className="rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={() => { void removeSchedule(); }}
                  type="button"
                >
                  일정 모두 삭제
                </button>
              )}
              <button
                className="rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                disabled={isSaving}
                onClick={() => { void generate(); }}
                type="button"
              >
                {isSaving ? "처리 중..." : tasks.length > 0 ? "일정 다시 만들기" : "일정 자동 만들기"}
              </button>
            </div>
          </div>

          {actionError && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
              <p>{actionError}</p>
              {actionErrorCode === "CROP_PERIOD_OUTSIDE_SEASON" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="rounded-full bg-red-700 px-4 py-2 text-white" href={`/seasons/${seasonId}/edit`}>시즌 기간 수정하기</Link>
                  <Link className="rounded-full border border-red-300 bg-white px-4 py-2 text-red-800" href={`/seasons/${seasonId}/layout`}>작물 다시 선택하기</Link>
                </div>
              )}
            </div>
          )}
          {scheduleIsOutdated && (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800" role="alert">
              일정을 만든 뒤 작물 배치가 변경되었습니다. 현재 배치 기준으로 일정을 다시 만들어 주세요.
            </p>
          )}
          {tasks.length > 0 ? (
            <TaskList
              disabled={isSaving}
              onDelete={removeTask}
              onToggle={toggleTask}
              tasks={tasks}
            />
          ) : (
            <EmptySchedule
              description="버튼을 누르면 배치한 작물별 심기와 수확 시작 일정을 만듭니다."
              title="아직 만든 일정이 없어요"
            />
          )}
        </>
      )}

      <p className="mt-5 text-sm leading-6 text-muted">
        날짜는 작물 기준 데이터의 월 단위 권장 시기와 시즌 기간이 처음 겹치는 날입니다. 지역·품종·날씨와 실제 생육 상태에 따라 조정해 주세요.
      </p>
    </div>
  );
}

function TaskList({
  disabled,
  onDelete,
  onToggle,
  tasks,
}: {
  disabled: boolean;
  onDelete: (task: CultivationTask) => Promise<void>;
  onToggle: (task: CultivationTask) => Promise<void>;
  tasks: readonly CultivationTask[];
}) {
  return (
    <ol className="mt-5 space-y-3">
      {tasks.map((task) => (
        <li className={`surface-panel p-5 transition hover:shadow-[var(--shadow-md)] ${task.status === "completed" ? "opacity-60" : ""}`} key={task.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-leaf">{task.dueDate}</p>
              <h3 className={`mt-1 text-lg font-bold ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${TASK_TYPE_STYLES[task.type]}`}>
              {TASK_TYPE_LABELS[task.type]}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{task.notes}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-leaf-soft px-4 py-2 text-xs font-bold text-leaf-dark disabled:opacity-50"
              disabled={disabled}
              onClick={() => { void onToggle(task); }}
              type="button"
            >
              {task.status === "completed" ? "미완료로 되돌리기" : "완료하기"}
            </button>
            <button
              className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
              disabled={disabled}
              onClick={() => { void onDelete(task); }}
              type="button"
            >
              삭제
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function EmptySchedule({
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
    <section className="surface-panel mt-5 border-dashed p-7 text-center">
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

function compareTasks(left: CultivationTask, right: CultivationTask): number {
  return left.dueDate.localeCompare(right.dueDate)
    || left.title.localeCompare(right.title, "ko-KR");
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "재배 일정을 처리하지 못했습니다.";
}
