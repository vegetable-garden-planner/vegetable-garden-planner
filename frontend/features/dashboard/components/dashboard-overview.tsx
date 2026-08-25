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
import { DashboardAlertList } from "@/features/dashboard/components/dashboard-alert-list";
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
import type { CultivationRecord } from "@/features/cultivation-record/domain/cultivation-record";
import type { ContainerPlacementListItem } from "@/features/container-placement/domain/container-placement";

const STATUS_LABELS: Record<GrowingSeasonStatus, string> = {
  planned: "예정",
  active: "진행 중",
  completed: "종료",
};

const STATUS_STYLES: Record<GrowingSeasonStatus, string> = {
  planned: "bg-sky-50 text-sky-700",
  active: "bg-leaf-soft text-leaf-dark",
  completed: "bg-stone-100 text-stone-600",
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
        <DashboardHero alertCount={alerts.totalCount} plantCount={registeredPlants.length} summary={summary} />
        <div className="dashboard-content">
          <DashboardGettingStarted hasSpace={summary.spaceCount > 0} nextAction={summary.nextAction} />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHero alertCount={alerts.totalCount} plantCount={registeredPlants.length} summary={summary} />
      <div className="dashboard-content">
        <section className="dashboard-plan-section" aria-labelledby="dashboard-plan-title">
          <div className="dashboard-section-heading">
            <div>
              <p>나의 재배 현황</p>
              <h2 id="dashboard-plan-title">공간별 재배 계획</h2>
            </div>
            <Link href="/seasons">전체 계획 보기 <span aria-hidden="true">→</span></Link>
          </div>

          <div className="dashboard-plan-layout">
            <section className="dashboard-season-board" aria-label="최근 재배 시즌">
              <div className="dashboard-season-board-header">
                <div>
                  <p>현재 연결된 공간과 시즌</p>
                  <strong>{summary.spaceCount}개 공간 · {summary.seasonCount}개 시즌</strong>
                </div>
                <span>{summary.activeSeasonCount > 0 ? `${summary.activeSeasonCount}개 진행 중` : "준비 중"}</span>
              </div>
              <ul className="dashboard-season-list">
                {summary.recentSeasons.map((season) => <SeasonPlanCard key={season.id} season={season} />)}
              </ul>
            </section>

            <aside className="dashboard-plan-aside" aria-label="재배 계획 보조 정보">
              <DashboardInfoCard
                rows={[
                  ["등록 공간", `${summary.spaceCount}개`],
                  ["작물 배치", `${summary.layoutCount}개`],
                  ["관리할 식물", `${registeredPlants.length}종`],
                ]}
                title="계획 현황"
              />
              <section className="dashboard-guide-card">
                <p>다음 추천 단계</p>
                <h3>{summary.nextAction.title}</h3>
                <span>{summary.nextAction.description}</span>
                <Link href={summary.nextAction.href}>{summary.nextAction.label} <span aria-hidden="true">→</span></Link>
              </section>
              <DashboardInfoCard
                rows={[
                  ["기한 지난 일", `${alerts.overdueCount}개`],
                  ["오늘 할 일", `${alerts.todayCount}개`],
                  ["7일 이내", `${alerts.upcomingCount}개`],
                ]}
                title="일정 적합도"
              />
            </aside>
          </div>
        </section>

        <DashboardJourney />

        <DashboardAlertList summary={alerts} />

        <RegisteredPlantList plants={registeredPlants} />

        <DashboardStartBanner nextAction={summary.nextAction} />
      </div>
    </>
  );
}

function DashboardHero({
  alertCount,
  plantCount,
  summary,
}: {
  alertCount: number;
  plantCount: number;
  summary: DashboardSummary;
}) {
  return (
    <section className="dashboard-hero">
      <Image alt="햇살이 드는 창가의 허브와 화분" className="dashboard-hero-image" fill priority sizes="100vw" src="/figma/planner-hero.webp" />
      <span className="dashboard-hero-shade" aria-hidden="true" />
      <div className="dashboard-hero-inner">
        <div className="dashboard-hero-copy">
          <p>나의 재배 홈</p>
          <h1>배치·재배 계획</h1>
          <span>내 공간에 무엇을 심고, 오늘 무엇을 관리할지 한눈에 확인해 보세요.</span>
        </div>
        <div className="dashboard-hero-summary" aria-label="재배 현황 요약">
          <HeroStat label="재배 공간" value={`${summary.spaceCount}개`} />
          <HeroStat label="관리 식물" value={`${plantCount}종`} />
          <HeroStat label="해야 할 일" value={`${alertCount}`} />
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

function SeasonPlanCard({ season }: { season: DashboardSeason }) {
  const href = season.layoutHref ?? season.scheduleHref ?? "/seasons";
  const actionLabel = season.layoutHref ? "작물 배치" : season.scheduleHref ? "재배 일정" : "계획 관리";

  return (
    <li className="dashboard-season-card">
      <div className="dashboard-season-card-heading">
        <div>
          <h3>{season.name}</h3>
          <p>{season.spaceName} · {season.startDate} ~ {season.endDate}</p>
        </div>
        <span className={STATUS_STYLES[season.status]}>{STATUS_LABELS[season.status]}</span>
      </div>
      <div className="dashboard-season-bed" aria-hidden="true">
        <span>공간</span>
        <span className={season.layoutHref ? "is-next" : "is-done"}>배치</span>
        <span className={season.scheduleHref ? "is-next" : ""}>일정</span>
      </div>
      <div className="dashboard-season-card-footer">
        <p>{season.layoutHref ? "텃밭에 작물을 놓을 차례예요." : season.scheduleHref ? "배치에 맞는 재배 일정을 준비해요." : "저장된 계획을 이어서 관리해요."}</p>
        <Link href={href}>{actionLabel} <span aria-hidden="true">→</span></Link>
      </div>
    </li>
  );
}

function DashboardInfoCard({
  rows,
  title,
}: {
  rows: readonly (readonly [string, string])[];
  title: string;
}) {
  return (
    <section className="dashboard-info-card">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DashboardJourney() {
  const steps = [
    ["1. 공간 준비", "재배 장소와 햇빛 조건 확인", "공간 등록"],
    ["2. 작물 계획", "공간에 맞는 작물과 배치 결정", "배치 만들기"],
    ["3. 재배 관리", "심기부터 수확까지 일정 관리", "오늘 할 일"],
  ] as const;

  return (
    <section className="dashboard-journey" aria-labelledby="dashboard-journey-title">
      <div className="dashboard-section-heading">
        <div>
          <p>재배 계획 요약</p>
          <h2 id="dashboard-journey-title">공간에서 수확까지</h2>
        </div>
      </div>
      <ol>
        {steps.map(([title, description, caption], index) => (
          <li key={title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
              <strong>{caption}</strong>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DashboardStartBanner({
  nextAction,
}: {
  nextAction: DashboardSummary["nextAction"];
}) {
  return (
    <section className="dashboard-start-banner">
      <div className="dashboard-start-image">
        <Image alt="창가에서 자라는 여러 화분" fill sizes="(max-width: 720px) 100vw, 34vw" src="/figma/planner-hero.webp" />
      </div>
      <div className="dashboard-start-copy">
        <p>이 계획을 이어갈까요?</p>
        <span>{nextAction.description}</span>
      </div>
      <div className="dashboard-start-actions">
        <Link href="/seasons">계획 둘러보기</Link>
        <Link href={nextAction.href}>{nextAction.label}</Link>
      </div>
    </section>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-state surface-panel p-6" role="status">
      <p className="font-bold">재배 홈을 준비하고 있어요</p>
      <p className="mt-2 text-sm text-muted">공간과 시즌, 오늘 할 일을 차례로 불러오고 있습니다.</p>
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
      title: "첫 시즌 만들기",
      description: "공간을 고르고 재배 기간과 대표 작물을 정해요.",
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
  if (state.status !== "ready") throw new Error("시즌 정보를 불러오지 못했습니다.");
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
