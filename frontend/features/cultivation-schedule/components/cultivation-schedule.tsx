"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { InlineConfirm } from "@/components/inline-confirm";
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
import { useContainerPlacements } from "@/features/container-placement/hooks/use-container-placements";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import type { GrowingSpaceType } from "@/shared/domain/growing-environment";
import { ApiError } from "@/shared/infrastructure/api-client";
import styles from "./cultivation-schedule.module.css";

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
  const containerPlacementsState = useContainerPlacements(seasonId);
  const tasksState = useCultivationTasks();
  const isRunningRef = useRef(false);
  const [actionError, setActionError] = useState("");
  const [actionErrorCode, setActionErrorCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingGenerate, setConfirmingGenerate] = useState(false);
  const [confirmingRemoveAll, setConfirmingRemoveAll] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState("");

  if (seasonsState.status === "error") return <Message message={seasonsState.message} onRetry={() => void seasonsState.reload()} />;
  if (spacesState.status === "error") return <Message message={spacesState.message} onRetry={() => void spacesState.reload()} />;
  if (layoutsState.status === "error") return <Message message={layoutsState.message} onRetry={() => void layoutsState.reload()} />;
  if (containerPlacementsState.status === "error") return <Message message={containerPlacementsState.message} onRetry={() => void containerPlacementsState.reload()} />;
  if (tasksState.status === "error") return <Message message={tasksState.message} onRetry={() => void tasksState.reload()} />;
  if (layoutsState.status === "loading" || containerPlacementsState.status === "loading" || tasksState.status === "loading") {
    return <p className="surface-panel p-5 text-muted" role="status">재배 일정을 불러오고 있습니다.</p>;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <Message message="재배 일정을 만들 재배 계획을 찾을 수 없습니다." />;
  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <Message message="재배 계획에 연결된 재배 공간을 찾을 수 없습니다." />;
  const currentSeason = season;
  const currentSpace = space;

  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  const containerPlacements = containerPlacementsState.placements.placements;
  const hasCropSource = space.type === "garden"
    ? Boolean(layout && layout.placements.length > 0)
    : containerPlacements.length > 0 || Boolean(season.featuredCropId);
  const tasks = tasksState.tasks
    .filter((task) => task.seasonId === seasonId)
    .sort(compareTasks);
  const scheduleSourceUpdatedAt = space.type === "garden" ? layout?.updatedAt : season.updatedAt;
  const scheduleIsOutdated = scheduleSourceUpdatedAt
    ? tasks.some((task) => task.updatedAt < scheduleSourceUpdatedAt)
    : false;
  const emptyState = getScheduleEmptyState(
    space.type,
    hasCropSource,
    layout?.placements.length,
    seasonId,
  );
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const pendingCount = tasks.length - completedCount;
  const cropCount = space.type === "garden"
    ? new Set(layout?.placements.map((item) => item.cropId)).size
    : containerPlacements.length > 0
      ? new Set(containerPlacements.map((item) => item.cropId)).size
      : season.featuredCropId ? 1 : 0;

  async function runAction(action: () => Promise<void>): Promise<void> {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
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
      isRunningRef.current = false;
      setIsSaving(false);
    }
  }

  function requestGenerate(): void {
    setActionError("");
    setActionErrorCode("");
    if (currentSpace.type === "garden" && !layout) {
      setActionError("먼저 텃밭 격자를 만들고 작물을 배치해 주세요.");
      return;
    }
    if (currentSpace.type !== "garden" && !hasCropSource) {
      setActionError("먼저 화분에 키울 작물을 배치해 주세요.");
      return;
    }
    if (tasks.length > 0) {
      setConfirmingGenerate(true);
      return;
    }
    void generate();
  }

  async function generate(): Promise<void> {
    const sourceVersion = currentSpace.type === "garden" ? layout?.version : currentSeason.version;
    if (sourceVersion === undefined) return;
    await runAction(async () => { await generateCultivationTasks(currentSeason.id, sourceVersion); });
    setConfirmingGenerate(false);
  }

  async function removeSchedule(): Promise<void> {
    await runAction(async () => { await deleteSeasonCultivationTasks(seasonId, tasks); });
    setConfirmingRemoveAll(false);
  }

  async function toggleTask(task: CultivationTask): Promise<void> {
    const status = task.status === "completed" ? "pending" : "completed";
    await runAction(async () => { await updateCultivationTask(task, { status }); });
  }

  async function removeTask(task: CultivationTask): Promise<void> {
    await runAction(async () => { await deleteCultivationTask(task); });
    setDeletingTaskId("");
  }

  return (
    <ScheduleView
      actionError={actionError}
      actionErrorCode={actionErrorCode}
      completedCount={completedCount}
      confirmingGenerate={confirmingGenerate}
      confirmingRemoveAll={confirmingRemoveAll}
      cropCount={cropCount}
      deletingTaskId={deletingTaskId}
      emptyState={emptyState}
      isSaving={isSaving}
      onCancelDeleteTask={() => setDeletingTaskId("")}
      onCancelGenerate={() => setConfirmingGenerate(false)}
      onCancelRemoveAll={() => setConfirmingRemoveAll(false)}
      onConfirmGenerate={generate}
      onConfirmRemoveAll={removeSchedule}
      onDeleteTask={removeTask}
      onDeleteTaskRequest={setDeletingTaskId}
      onGenerate={requestGenerate}
      onRemoveSchedule={() => setConfirmingRemoveAll(true)}
      onToggleTask={toggleTask}
      pendingCount={pendingCount}
      scheduleIsOutdated={scheduleIsOutdated}
      seasonEndDate={season.endDate}
      seasonId={seasonId}
      seasonName={season.name}
      seasonStartDate={season.startDate}
      spaceName={space.name}
      spaceType={space.type}
      tasks={tasks}
    />
  );
}

interface ScheduleEmptyState {
  description: string;
  href: string;
  label: string;
  title: string;
}

interface ScheduleViewProps {
  actionError: string;
  actionErrorCode: string;
  completedCount: number;
  confirmingGenerate: boolean;
  confirmingRemoveAll: boolean;
  cropCount: number;
  deletingTaskId: string;
  emptyState: ScheduleEmptyState | null;
  isSaving: boolean;
  onCancelDeleteTask: () => void;
  onCancelGenerate: () => void;
  onCancelRemoveAll: () => void;
  onConfirmGenerate: () => Promise<void>;
  onConfirmRemoveAll: () => Promise<void>;
  onDeleteTask: (task: CultivationTask) => Promise<void>;
  onDeleteTaskRequest: (taskId: string) => void;
  onGenerate: () => void;
  onRemoveSchedule: () => void;
  onToggleTask: (task: CultivationTask) => Promise<void>;
  pendingCount: number;
  scheduleIsOutdated: boolean;
  seasonEndDate: string;
  seasonId: string;
  seasonName: string;
  seasonStartDate: string;
  spaceName: string;
  spaceType: GrowingSpaceType;
  tasks: readonly CultivationTask[];
}

function ScheduleView(props: ScheduleViewProps) {
  const cropDescription = props.cropCount > 0
    ? `${props.cropCount}종 작물을 기준으로 일정을 관리해요.`
    : "일정을 만들 작물을 먼저 준비해 주세요.";

  return (
    <div className={styles.page}>
      <section className={styles.overview} aria-labelledby="schedule-season-title">
        <div className={styles.overviewCopy}>
          {/* 계획 이름과 공간은 위 탭 머리에 이미 있다. 여기서는 기간과 작물만 말한다. */}
          <p>재배 기간</p>
          <h2 id="schedule-season-title">{props.seasonStartDate} ~ {props.seasonEndDate}</h2>
          <strong>{cropDescription}</strong>
        </div>
        <dl className={styles.overviewStats} aria-label="일정 진행 현황">
          <ScheduleStat label="전체 일정" value={`${props.tasks.length}개`} />
          <ScheduleStat label="완료" value={`${props.completedCount}개`} />
          <ScheduleStat label="남은 일정" value={`${props.pendingCount}개`} />
        </dl>
      </section>

      {props.emptyState
        ? <EmptySchedule {...props.emptyState} />
        : <ScheduleReadyContent {...props} />}

      <p className={styles.note}>날짜는 작물 기준 데이터의 월 단위 권장 시기와 재배 기간이 처음 겹치는 날입니다. 지역·품종·날씨와 실제 생육 상태에 따라 조정해 주세요.</p>
    </div>
  );
}

function ScheduleReadyContent(props: ScheduleViewProps) {
  const hasTasks = props.tasks.length > 0;
  const sourceTitle = `배치 작물 ${props.cropCount}종`;
  const planHref = props.spaceType === "garden"
    ? `/seasons/${props.seasonId}/layout`
    : `/seasons/${props.seasonId}/placements`;

  return (
    <div className={styles.scheduleLayout}>
      <main className={styles.mainColumn}>
        <section className={styles.commandCard} aria-labelledby="schedule-command-title">
          <div className={styles.commandHeader}>
            <div><p>일정 만들기</p><h2 id="schedule-command-title">{sourceTitle}</h2><span>작물별 권장 심기와 수확 시기를 재배 기간 안에서 계산합니다.</span></div>
            <div className={styles.actionButtons}>
              {hasTasks && <button className={styles.dangerButton} disabled={props.isSaving} onClick={props.onRemoveSchedule} type="button">일정 모두 삭제</button>}
              <button className={styles.primaryButton} disabled={props.isSaving} onClick={props.onGenerate} type="button">
                {props.isSaving ? "처리 중..." : hasTasks ? "일정 다시 만들기" : "일정 자동 만들기"}
              </button>
            </div>
          </div>
          {props.confirmingRemoveAll && (
            <InlineConfirm
              confirmLabel="모두 삭제하기"
              description="이 재배 계획의 일정을 모두 삭제합니다. 되돌릴 수 없습니다."
              disabled={props.isSaving}
              onCancel={props.onCancelRemoveAll}
              onConfirm={() => { void props.onConfirmRemoveAll(); }}
              title="일정을 모두 삭제할까요?"
            />
          )}
          {props.confirmingGenerate && (
            <InlineConfirm
              confirmLabel="다시 만들기"
              description="현재 일정을 지우고 지금의 작물 선택 기준으로 새로 만듭니다."
              disabled={props.isSaving}
              onCancel={props.onCancelGenerate}
              onConfirm={() => { void props.onConfirmGenerate(); }}
              title="기존 일정을 다시 만들까요?"
            />
          )}
        </section>

        {props.actionError && (
          <div className={styles.error} role="alert">
            <p>{props.actionError}</p>
            {props.actionErrorCode === "CROP_PERIOD_OUTSIDE_SEASON" && (
              <div className={styles.actionButtons}>
                <Link href={`/seasons/${props.seasonId}/edit`}>재배 기간 수정하기</Link>
                <Link href={planHref}>작물 다시 선택하기</Link>
              </div>
            )}
          </div>
        )}
        {props.scheduleIsOutdated && <p className={styles.outdated} role="alert">일정을 만든 뒤 작물 선택 또는 배치가 변경되었습니다. 현재 계획으로 일정을 다시 만들어 주세요.</p>}
        {hasTasks
          ? (
              <TaskList
                deletingTaskId={props.deletingTaskId}
                disabled={props.isSaving}
                onCancelDelete={props.onCancelDeleteTask}
                onDelete={props.onDeleteTask}
                onDeleteRequest={props.onDeleteTaskRequest}
                onToggle={props.onToggleTask}
                tasks={props.tasks}
              />
            )
          : <EmptySchedule description="버튼을 누르면 선택한 작물별 심기와 수확 시작 일정을 만듭니다." title="아직 만든 일정이 없어요" />}
      </main>

      <aside className={styles.sideColumn} aria-label="일정 관리 보조 정보">
        <ScheduleProgress completed={props.completedCount} total={props.tasks.length} />
        <section className={styles.sideCard}>
          <p>일정 계산 기준</p>
          <h2>추천 시기를 참고해요</h2>
          <ul className={styles.basisList}>
            <li>재배 기간과 작물별 권장 월을 겹쳐 계산합니다.</li>
            <li>지역·품종·날씨에 따라 실제 날짜는 달라질 수 있습니다.</li>
            <li>생육 상태를 확인해 완료 여부를 직접 관리하세요.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

function ScheduleStat({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function ScheduleProgress({ completed, total }: { completed: number; total: number }) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section className={styles.sideCard}>
      <div className={styles.progressHeader}><div><p>진행 현황</p><h2>이번 재배 일정</h2></div><strong>{percentage}%</strong></div>
      <div className={styles.progressTrack} aria-label={`일정 ${percentage}% 완료`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <span>{total === 0 ? "일정을 만들면 진행률을 확인할 수 있어요." : `${total}개 중 ${completed}개를 완료했어요.`}</span>
    </section>
  );
}

function getScheduleEmptyState(
  spaceType: GrowingSpaceType,
  hasCropSource: boolean,
  placementCount: number | undefined,
  seasonId: string,
): ScheduleEmptyState | null {
  if (spaceType !== "garden") {
    return hasCropSource ? null : {
      description: "화분·베란다는 격자를 만들지 않습니다. 화분마다 키울 작물을 배치하면 바로 일정을 만들 수 있어요.",
      href: `/seasons/${seasonId}/placements`,
      label: "화분 배치하러 가기",
      title: "먼저 화분에 작물을 배치해 주세요",
    };
  }
  if (placementCount === undefined) {
    return {
      description: "자동 일정은 격자에 배치한 작물을 기준으로 만듭니다. 먼저 작물 배치를 완료해 주세요.",
      href: `/seasons/${seasonId}/layout`,
      label: "작물 배치하러 가기",
      title: "아직 작물 배치가 없어요",
    };
  }
  if (placementCount === 0) {
    return {
      description: "격자는 만들어졌지만 배치된 작물이 없습니다. 키울 작물을 하나 이상 배치해 주세요.",
      href: `/seasons/${seasonId}/layout`,
      label: "작물 배치하러 가기",
      title: "일정을 만들 작물이 없어요",
    };
  }
  return null;
}

function TaskList({
  deletingTaskId,
  disabled,
  onCancelDelete,
  onDelete,
  onDeleteRequest,
  onToggle,
  tasks,
}: {
  deletingTaskId: string;
  disabled: boolean;
  onCancelDelete: () => void;
  onDelete: (task: CultivationTask) => Promise<void>;
  onDeleteRequest: (taskId: string) => void;
  onToggle: (task: CultivationTask) => Promise<void>;
  tasks: readonly CultivationTask[];
}) {
  return (
    <section className={styles.timeline} aria-labelledby="schedule-timeline-title">
      <div className={styles.timelineHeader}>
        <div><p>재배 타임라인</p><h2 id="schedule-timeline-title">해야 할 일</h2></div>
        <span>{tasks.length}개 일정</span>
      </div>
      <ol className={styles.timelineList}>
        {tasks.map((task) => (
          <li className={task.status === "completed" ? styles.completed : ""} key={task.id}>
            <span className={styles.taskNode} aria-hidden="true">{TASK_TYPE_LABELS[task.type].slice(0, 1)}</span>
            <article className={styles.taskCard}>
              <div className={styles.taskCardHeader}>
                <div><time dateTime={task.dueDate}>{task.dueDate}</time><h3>{task.title}</h3></div>
                <span className={TASK_TYPE_STYLES[task.type]}>{TASK_TYPE_LABELS[task.type]}</span>
              </div>
              <p className={styles.taskNotes}>{task.notes}</p>
              {deletingTaskId === task.id ? (
                <InlineConfirm
                  description="삭제하면 되돌릴 수 없습니다."
                  disabled={disabled}
                  onCancel={onCancelDelete}
                  onConfirm={() => { void onDelete(task); }}
                  title={`'${task.title}' 일정을 삭제할까요?`}
                />
              ) : (
                <div className={styles.taskActions}>
                  <button className={styles.completeButton} disabled={disabled} onClick={() => { void onToggle(task); }} type="button">
                    {task.status === "completed" ? "미완료로 되돌리기" : "완료하기"}
                  </button>
                  <button className={styles.deleteButton} disabled={disabled} onClick={() => onDeleteRequest(task.id)} type="button">삭제</button>
                </div>
              )}
            </article>
          </li>
        ))}
      </ol>
    </section>
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
    <section className={styles.empty}>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      {href && label && <Link href={href}>{label}</Link>}
    </section>
  );
}

function Message({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-[#fff4f2] p-5 text-[var(--color-danger)]" role="alert">
      <p className="font-semibold">{message}</p>
      {onRetry ? (
        <button className="mt-4 inline-flex font-bold underline" onClick={onRetry} type="button">다시 시도</button>
      ) : (
        <Link className="mt-4 inline-flex font-bold underline" href="/seasons">내 재배 계획으로 돌아가기</Link>
      )}
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
