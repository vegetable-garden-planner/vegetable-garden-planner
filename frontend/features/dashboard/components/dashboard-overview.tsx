"use client";

import Image from "next/image";
import Link from "next/link";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useAllCultivationRecords, type AllCultivationRecordsState } from "@/features/cultivation-record/hooks/use-all-cultivation-records";
import {
  useAllContainerPlacements,
  type AllContainerPlacementsState,
} from "@/features/container-placement/hooks/use-all-container-placements";
import { useCultivationTasks, type CultivationTasksState } from "@/features/cultivation-schedule/hooks/use-cultivation-tasks";
import {
  createDashboardAlerts,
  formatLocalDateOnly,
} from "@/features/dashboard/domain/dashboard-alert";
import { useGardenLayouts, type GardenLayoutsState } from "@/features/garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons, type GrowingSeasonsState } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSeasonStatus } from "@/features/growing-season/domain/growing-season";
import { useGrowingSpaces, type GrowingSpacesState } from "@/features/growing-space/hooks/use-growing-spaces";
import {
  createDashboardSummary,
  type DashboardSeason,
  type DashboardSummary,
} from "@/features/dashboard/domain/dashboard-summary";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { RegisteredPlantList } from "@/features/dashboard/components/registered-plant-list";
import { createRegisteredPlantSummaries } from "@/features/dashboard/domain/registered-plant-summary";
import { useAllWateringSchedules, type AllWateringSchedulesState } from "@/features/watering/hooks/use-all-watering-schedules";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import type { PersistedGrowingSeason } from "@/features/growing-season/domain/growing-season";
import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import type { CultivationTask } from "@/features/cultivation-schedule/domain/cultivation-task";
import type { WateringSchedule } from "@/features/watering/domain/watering";
import {
  CULTIVATION_RECORD_TYPE_LABELS,
  type CultivationRecord,
} from "@/features/cultivation-record/domain/cultivation-record";
import type { ContainerPlacementListItem } from "@/features/container-placement/domain/container-placement";
import {
  calculateProgress,
  createHomeDashboardModel,
  daysBetween,
  type HomeDashboardModel,
} from "@/features/home/domain/home-dashboard";
import homeStyles from "./dashboard-home.module.css";

const STATUS_LABELS: Record<GrowingSeasonStatus, string> = {
  planned: "예정",
  active: "진행 중",
  completed: "종료",
};

const STATUS_STYLE_NAMES: Record<GrowingSeasonStatus, string> = {
  planned: homeStyles.statusPlanned,
  active: homeStyles.statusActive,
  completed: homeStyles.statusCompleted,
};

export function DashboardOverview() {
  const auth = useAuthSession();
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const layoutsState = useGardenLayouts();
  const tasksState = useCultivationTasks();
  const wateringState = useAllWateringSchedules();
  const cropCatalog = useCropCatalog();
  const recordsState = useAllCultivationRecords();
  const containerPlacementsState = useAllContainerPlacements();

  const resourceStates = [
    spacesState,
    seasonsState,
    layoutsState,
    tasksState,
    wateringState,
    cropCatalog,
    recordsState,
    containerPlacementsState,
  ];
  const loadErrorMessage = auth.state.status === "error"
    ? auth.state.message
    : resourceStates.find((state) => state.status === "error")?.message;
  if (loadErrorMessage) return <DashboardLoadError detail={loadErrorMessage} />;
  if (resourceStates.some((state) => state.status === "loading")) return <DashboardLoading />;
  if (auth.state.status !== "authenticated") return null;

  const spaces = requireSpaces(spacesState);
  const seasons = requireSeasons(seasonsState);
  const layouts = requireLayouts(layoutsState);
  const tasks = requireTasks(tasksState);
  const wateringSchedules = requireWateringSchedules(wateringState);
  const crops = cropCatalog.crops;
  const records = requireRecords(recordsState);
  const containerPlacements = requireContainerPlacements(containerPlacementsState);

  const today = formatLocalDateOnly(new Date());
  const containerPlacementSeasonIds = new Set(
    containerPlacements.map((placement) => placement.seasonId),
  );
  const representativeCropIdBySeasonId = new Map<string, string>();
  for (const placement of containerPlacements) {
    if (!representativeCropIdBySeasonId.has(placement.seasonId)) {
      representativeCropIdBySeasonId.set(placement.seasonId, placement.cropId);
    }
  }
  const summary = createDashboardSummary(
    spaces,
    seasons,
    layouts,
    tasks,
    today,
    containerPlacementSeasonIds,
  );
  let alerts;
  try {
    alerts = createDashboardAlerts({ tasks, wateringSchedules, crops }, today);
  } catch (error) {
    return <DashboardLoadError detail={error instanceof Error ? error.message : "대시보드 알림을 계산하지 못했습니다."} />;
  }
  const registeredPlants = createRegisteredPlantSummaries(
    seasons,
    crops,
    spaces,
    tasks,
    records,
    new Set(alerts.alerts.map((alert) => alert.seasonId)),
    today,
    4,
    representativeCropIdBySeasonId,
  );

  if (summary.spaceCount === 0 || summary.seasonCount === 0) {
    return (
      <>
        <DashboardHero
          overdueCount={alerts.overdueCount}
          todayCount={alerts.todayCount}
          summary={summary}
        />
        <div className="dashboard-content">
          <DashboardGettingStarted hasSpace={summary.spaceCount > 0} nextAction={summary.nextAction} />
        </div>
      </>
    );
  }

  // 재배 일수·진행률·다음 작업 계산은 features/home 의 것을 그대로 쓴다.
  const homeModel = createHomeDashboardModel(
    spaces,
    seasons,
    layouts,
    tasks,
    crops,
    today,
    containerPlacements,
  );
  const seasonsById = new Map(seasons.map((season) => [season.id, season]));
  const overdueSeasonIds = new Set(
    tasks
      .filter((task) => task.status === "pending" && task.dueDate < today)
      .map((task) => task.seasonId),
  );
  const recentRecords = [...records]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 2);

  return (
    <>
      <DashboardHero
        overdueCount={alerts.overdueCount}
        todayCount={alerts.todayCount}
        summary={summary}
      />
      <div className="dashboard-content">
        <TodayPanel tasks={homeModel.tasks} overdueCount={alerts.overdueCount} />

        <section className={homeStyles.section} aria-labelledby="dashboard-plan-title">
          <div className={homeStyles.sectionHead}>
            <div>
              <p>지금 키우는 것</p>
              <h2 id="dashboard-plan-title">내 재배 계획</h2>
            </div>
            <Link className={homeStyles.sectionMore} href="/seasons">
              전체 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className={homeStyles.cards}>
            {summary.recentSeasons.map((season) => (
              <PlanCard
                key={season.id}
                needsAttention={overdueSeasonIds.has(season.id)}
                nextTask={tasks.find((task) => task.seasonId === season.id && task.status === "pending")}
                season={season}
                today={today}
                source={seasonsById.get(season.id)}
              />
            ))}
          </ul>
        </section>

        <NextActionBanner nextAction={summary.nextAction} />

        {/*
          "일정 알림"은 위 "해야 할 일"과 같은 작업을 한 번 더 보여 줘서 홈에서 뺐다.
          컴포넌트(DashboardAlertList)와 계산(dashboard-alert)은 그대로 두었고,
          기한 지난 개수는 히어로와 오늘 패널에 남아 있다.
        */}

        {recentRecords.length > 0 && (
          <section className={homeStyles.section} aria-labelledby="dashboard-records-title">
            <div className={homeStyles.sectionHead}>
              <div>
                <p>남긴 기록</p>
                <h2 id="dashboard-records-title">최근 재배 기록</h2>
              </div>
            </div>
            <ul className={homeStyles.records}>
              {recentRecords.map((record) => (
                <li key={record.id}>
                  <Link className={homeStyles.recordItem} href={`/seasons/${record.seasonId}/records`}>
                    <span className={homeStyles.recordCopy}>
                      <strong>{record.notes || CULTIVATION_RECORD_TYPE_LABELS[record.type]}</strong>
                      <small>
                        {seasonsById.get(record.seasonId)?.name ?? "재배 계획"} · {CULTIVATION_RECORD_TYPE_LABELS[record.type]}
                      </small>
                    </span>
                    <span className={homeStyles.recordDate}>{record.occurredAt.slice(0, 10)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <RegisteredPlantList plants={registeredPlants} />
      </div>
    </>
  );
}

/** 오늘 해야 할 일 — 계산은 features/home 의 모델을 그대로 쓴다. */
function TodayPanel({
  overdueCount,
  tasks,
}: {
  overdueCount: number;
  tasks: HomeDashboardModel["tasks"];
}) {
  // 제목의 숫자는 아래 목록의 개수와 반드시 같아야 한다.
  // 예전에는 제목이 "오늘까지", 목록이 "이번 주"라 둘이 어긋나 보였다.
  return (
    <section className={homeStyles.section} aria-labelledby="dashboard-today-title">
      <div className={homeStyles.today}>
        <div className={homeStyles.sectionHead}>
          <div>
            <p>{overdueCount > 0 ? `기한 지난 일 ${overdueCount}개` : "이번 주"}</p>
            <h2 id="dashboard-today-title">
              {tasks.length > 0 ? `해야 할 일 ${tasks.length}가지` : "급한 일은 없어요"}
            </h2>
          </div>
        </div>
        {tasks.length > 0 ? (
          <ul className={homeStyles.todayList}>
            {tasks.map((task) => (
              <li key={task.id}>
                <Link className={homeStyles.todayItem} href={task.href}>
                  <span aria-hidden="true" className={homeStyles.todayMark}>{task.icon}</span>
                  <span className={homeStyles.todayCopy}>
                    <strong>{task.title}</strong>
                    <small>{task.description}</small>
                  </span>
                  <span aria-hidden="true" className={homeStyles.todayGo}>→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={homeStyles.todayEmpty}>일주일 안에 예정된 작업이 없어요. 기록을 남겨 두면 나중에 도움이 돼요.</p>
        )}
      </div>
    </section>
  );
}

/** 재배 계획 카드 — 상세는 전용 화면에서 하고, 여기서는 상태와 바로가기만 준다. */
function PlanCard({
  needsAttention,
  nextTask,
  season,
  source,
  today,
}: {
  needsAttention: boolean;
  nextTask: CultivationTask | undefined;
  season: DashboardSeason;
  source: PersistedGrowingSeason | undefined;
  today: string;
}) {
  const progress = source ? calculateProgress(source, today) : 0;
  const growingDay = source ? Math.max(0, daysBetween(source.startDate, today) + 1) : 0;

  return (
    <li className={`${homeStyles.card} ${needsAttention ? homeStyles.cardAttention : ""}`}>
      <div className={homeStyles.cardHead}>
        <div className={homeStyles.cardTitle}>
          <h3>{season.name}</h3>
          <p>{season.spaceName}</p>
        </div>
        <span className={`${homeStyles.status} ${STATUS_STYLE_NAMES[season.status]}`}>
          {STATUS_LABELS[season.status]}
        </span>
      </div>

      <div>
        <div className={homeStyles.progressRow}>
          <span>{season.status === "planned" ? "시작 전" : `재배 ${growingDay}일째`}</span>
          <b>{progress}%</b>
        </div>
        <div className={homeStyles.track}>
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`${homeStyles.cardNext} ${needsAttention ? homeStyles.cardNextWarn : ""}`}>
        <span>{needsAttention ? "지난 일이 있어요" : "다음 할 일"}</span>
        <strong>{nextTask ? `${nextTask.title} · ${nextTask.dueDate}` : "예정된 작업 없음"}</strong>
      </div>

      <div className={homeStyles.cardLinks}>
        <Link className={homeStyles.cardLink} href={season.placementHref}>배치 보기</Link>
        <Link className={homeStyles.cardLink} href={`/seasons/${season.id}/tasks`}>일정 보기</Link>
        <Link className={homeStyles.cardLink} href={season.recordHref}>기록하기</Link>
      </div>
    </li>
  );
}

/** 다음 추천 단계 — 화면에 한 번만 둔다. */
function NextActionBanner({ nextAction }: { nextAction: DashboardSummary["nextAction"] }) {
  return (
    <section className={homeStyles.section}>
      <div className={homeStyles.nextAction}>
        <div className={homeStyles.nextActionCopy}>
          <p>다음 추천 단계</p>
          <strong>{nextAction.title}</strong>
          <span>{nextAction.description}</span>
        </div>
        <Link className={homeStyles.nextActionGo} href={nextAction.href}>
          {nextAction.label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

function DashboardHero({
  overdueCount,
  summary,
  todayCount,
}: {
  overdueCount: number;
  summary: DashboardSummary;
  todayCount: number;
}) {
  return (
    <section className="dashboard-hero">
      <Image alt="햇살이 드는 창가의 허브와 화분" className="dashboard-hero-image" fill priority sizes="100vw" src="/figma/planner-hero.webp" />
      <span className="dashboard-hero-shade" aria-hidden="true" />
      <div className="dashboard-hero-inner">
        <div className="dashboard-hero-copy">
          <p>마이페이지</p>
          <h1>오늘의 텃밭</h1>
          <span>지금 키우는 것과 오늘 해야 할 일을 한곳에서 관리해요.</span>
        </div>
        <div className="dashboard-hero-summary" aria-label="재배 현황 요약">
          <HeroStat label="재배 중" value={`${summary.activeSeasonCount}개`} />
          <HeroStat label="오늘 할 일" value={`${todayCount}개`} />
          <HeroStat label="지난 일" value={`${overdueCount}개`} />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-state surface-panel p-6" role="status">
      <p className="font-bold">재배 홈을 준비하고 있어요</p>
      <p className="mt-2 text-sm text-muted">화분과 재배 계획, 오늘 할 일을 차례로 불러오고 있습니다.</p>
    </div>
  );
}

function DashboardGettingStarted({
  hasSpace,
  nextAction,
}: {
  hasSpace: boolean;
  nextAction: { title: string; description: string; href: string; label: string };
}) {
  const steps = [
    {
      title: "재배 공간 등록",
      description: "화분, 베란다, 마당·텃밭 중 실제로 키울 장소를 등록해요.",
      status: hasSpace ? "완료" : "지금 할 일",
    },
    {
      title: "첫 재배 시작하기",
      description: "공간을 고르고 재배 기간을 정해요.",
      status: hasSpace ? "지금 할 일" : "다음 단계",
    },
    {
      title: "재배 계획 관리",
      description: "안내에 따라 작물을 배치하거나 일정을 만들어 관리해요.",
      status: "그 다음",
    },
  ];

  return (
    <section className="surface-panel overflow-hidden" aria-labelledby="getting-started-title">
      <div className="bg-[var(--color-surface-warm)] p-6 sm:p-8">
        <p className="text-sm font-bold text-leaf">처음이어도 괜찮아요</p>
        <h2 className="mt-2 text-2xl font-bold" id="getting-started-title">{nextAction.title}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted">{nextAction.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="primary-action px-5 py-3" href={nextAction.href}>{nextAction.label}</Link>
          <Link className="inline-flex items-center px-3 py-3 text-sm font-bold text-leaf underline" href="/crops">작물 정보 먼저 둘러보기</Link>
        </div>
      </div>
      <ol className="grid gap-px bg-[var(--color-border)] sm:grid-cols-3">
        {steps.map((step, index) => (
          <li className="bg-white p-6" key={step.title}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-leaf-soft text-sm font-bold text-leaf-dark" aria-hidden="true">{index + 1}</span>
              <span className="text-xs font-bold text-leaf">{step.status}</span>
            </div>
            <h3 className="mt-4 font-bold">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DashboardLoadError({ detail }: { detail: string }) {
  return (
    <section className="dashboard-state surface-panel border-[#efcbc6] p-6 sm:p-8" aria-labelledby="dashboard-error-title" role="alert">
      <p className="text-sm font-bold text-[var(--color-danger)]">재배 정보를 불러오지 못했어요</p>
      <h2 className="mt-2 text-xl font-bold" id="dashboard-error-title">연결 상태를 다시 확인해 주세요</h2>
      <p className="mt-3 leading-7 text-muted">
        로그인 정보가 만료됐거나 연결이 잠시 불안정할 수 있어요. 다시 불러온 뒤에도 계속되면 로그인 화면에서 계정을 확인해 주세요.
      </p>
      <p className="mt-3 text-sm text-[var(--color-danger)]">확인 내용: {detail}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="primary-action px-5 py-3" onClick={() => window.location.reload()} type="button">다시 불러오기</button>
        <Link className="inline-flex items-center rounded-full border border-[var(--color-border)] px-5 py-3 font-bold" href={`/login?next=${encodeNextPath("/dashboard")}`}>로그인 화면으로 이동</Link>
      </div>
    </section>
  );
}

function requireSpaces(state: GrowingSpacesState): GrowingSpace[] {
  if (state.status !== "ready") throw new Error("공간 정보를 불러오지 못했습니다.");
  return state.spaces;
}

function requireSeasons(state: GrowingSeasonsState): PersistedGrowingSeason[] {
  if (state.status !== "ready") throw new Error("재배 계획 정보를 불러오지 못했습니다.");
  return state.seasons;
}

function requireLayouts(state: GardenLayoutsState): GardenLayout[] {
  if (state.status !== "ready") throw new Error("격자 정보를 불러오지 못했습니다.");
  return state.layouts;
}

function requireTasks(state: CultivationTasksState): CultivationTask[] {
  if (state.status !== "ready") throw new Error("일정 정보를 불러오지 못했습니다.");
  return state.tasks;
}

function requireWateringSchedules(state: AllWateringSchedulesState): WateringSchedule[] {
  if (state.status !== "ready") throw new Error("물주기 정보를 불러오지 못했습니다.");
  return state.schedules;
}

function requireRecords(state: AllCultivationRecordsState): CultivationRecord[] {
  if (state.status !== "ready") throw new Error("기록 정보를 불러오지 못했습니다.");
  return state.records;
}

function requireContainerPlacements(state: AllContainerPlacementsState): ContainerPlacementListItem[] {
  if (state.status !== "ready") throw new Error("화분 배치 정보를 불러오지 못했습니다.");
  return state.placements;
}
