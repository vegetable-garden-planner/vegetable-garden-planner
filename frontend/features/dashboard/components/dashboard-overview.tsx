"use client";

import Link from "next/link";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useCultivationTasks } from "@/features/cultivation-schedule/hooks/use-cultivation-tasks";
import { DashboardAlertList } from "@/features/dashboard/components/dashboard-alert-list";
import {
  createDashboardAlerts,
  formatLocalDateOnly,
} from "@/features/dashboard/domain/dashboard-alert";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSeasonStatus } from "@/features/growing-season/domain/growing-season";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { createDashboardSummary } from "@/features/dashboard/domain/dashboard-summary";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { RegisteredPlantList } from "@/features/dashboard/components/registered-plant-list";
import { createRegisteredPlantSummaries } from "@/features/dashboard/domain/registered-plant-summary";
import { useAllWateringSchedules } from "@/features/watering/hooks/use-all-watering-schedules";

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

  if (auth.state.status === "error") return <DashboardLoadError detail={auth.state.message} />;
  if (spacesState.status === "error") return <DashboardLoadError detail={spacesState.message} />;
  if (seasonsState.status === "error") return <DashboardLoadError detail={seasonsState.message} />;
  if (layoutsState.status === "error") return <DashboardLoadError detail={layoutsState.message} />;
  if (tasksState.status === "error") return <DashboardLoadError detail={tasksState.message} />;
  if (wateringState.status === "error") return <DashboardLoadError detail={wateringState.message} />;
  if (cropCatalog.status === "error") return <DashboardLoadError detail={cropCatalog.message} />;
  if (
    spacesState.status === "loading"
    || seasonsState.status === "loading"
    || layoutsState.status === "loading"
    || tasksState.status === "loading"
    || wateringState.status === "loading"
    || cropCatalog.status === "loading"
  ) {
    return <DashboardLoading />;
  }
  if (auth.state.status !== "authenticated") return null;

  const today = formatLocalDateOnly(new Date());
  const summary = createDashboardSummary(
    spacesState.spaces,
    seasonsState.seasons,
    layoutsState.layouts,
    tasksState.tasks,
    today,
  );
  let alerts;
  try {
    alerts = createDashboardAlerts({
      tasks: tasksState.tasks,
      wateringSchedules: wateringState.schedules,
      crops: cropCatalog.crops,
    }, today);
  } catch (error) {
    return <DashboardLoadError detail={error instanceof Error ? error.message : "대시보드 알림을 계산하지 못했습니다."} />;
  }
  const registeredPlants = createRegisteredPlantSummaries(
    seasonsState.seasons,
    cropCatalog.crops,
    today,
  );

  if (summary.spaceCount === 0 || summary.seasonCount === 0) {
    return <DashboardGettingStarted hasSpace={summary.spaceCount > 0} nextAction={summary.nextAction} />;
  }

  return (
    <div className="dashboard-overview">
      <section className="dashboard-stats grid grid-cols-2 gap-1 sm:grid-cols-4" aria-label="재배 현황 요약">
        <SummaryCard label="재배 공간" value={`${summary.spaceCount}개`} />
        <SummaryCard label="전체 시즌" value={`${summary.seasonCount}개`} />
        <SummaryCard label="진행 중" value={`${summary.activeSeasonCount}개`} />
        <SummaryCard label="작물 배치" value={`${summary.layoutCount}개`} />
      </section>

      <section className="dashboard-next-action rounded-[1.5rem] bg-[linear-gradient(135deg,var(--color-ink-strong),var(--color-primary-hover))] p-6 text-white shadow-[var(--shadow-md)] sm:p-8">
        <p className="text-sm font-bold text-[var(--color-accent)]">{auth.state.user.nickname}님의 다음 할 일</p>
        <div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold">{summary.nextAction.title}</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/75">{summary.nextAction.description}</p>
          </div>
          <Link className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-3 font-bold text-leaf" href={summary.nextAction.href}>
            {summary.nextAction.label} <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <DashboardAlertList summary={alerts} />

      <RegisteredPlantList plants={registeredPlants} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="surface-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">내 재배 시즌</h2>
            <Link className="text-sm font-bold text-leaf" href="/seasons">전체 보기</Link>
          </div>
          {summary.recentSeasons.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-cream p-5 text-sm leading-6 text-muted">
              아직 등록한 시즌이 없습니다. 공간을 등록한 다음 첫 시즌을 만들어 보세요.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {summary.recentSeasons.map((season) => (
                <li className="flex flex-col gap-3 py-4 first:pt-2 sm:flex-row sm:items-center" key={season.id}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-bold">{season.name}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[season.status]}`}>
                        {STATUS_LABELS[season.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{season.spaceName} · {season.startDate} ~ {season.endDate}</p>
                  </div>
                  <Link className="text-sm font-bold text-leaf" href={season.layoutHref ?? season.scheduleHref ?? "/seasons"}>
                    {season.layoutHref ? "작물 배치" : season.scheduleHref ? "재배 일정" : "관리하기"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel bg-[var(--color-surface-warm)] p-6">
          <h2 className="text-xl font-bold">빠른 작업</h2>
          <div className="mt-5 grid gap-3">
            <QuickLink href="/spaces/new" label="새 공간 등록" description="화분·베란다·텃밭 추가" />
            <QuickLink href="/seasons/new" label="새 시즌 만들기" description="재배 기간과 공간 연결" />
            <QuickLink href="/crops" label="작물 정보 보기" description="대표 작물의 시기와 간격 확인" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link className="rounded-2xl border border-[var(--color-border)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-leaf/30 hover:shadow-[var(--shadow-sm)]" href={href}>
      <p className="font-bold">{label} <span className="text-leaf" aria-hidden="true">→</span></p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </Link>
  );
}

function DashboardLoading() {
  return (
    <div className="surface-panel p-6" role="status">
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
    <section className="surface-panel border-red-200 p-6 sm:p-8" aria-labelledby="dashboard-error-title" role="alert">
      <p className="text-sm font-bold text-red-700">재배 정보를 불러오지 못했어요</p>
      <h2 className="mt-2 text-xl font-bold" id="dashboard-error-title">연결 상태를 다시 확인해 주세요</h2>
      <p className="mt-3 leading-7 text-muted">
        로그인 정보가 만료됐거나 연결이 잠시 불안정할 수 있어요. 다시 불러온 뒤에도 계속되면 로그인 화면에서 계정을 확인해 주세요.
      </p>
      <p className="mt-3 text-sm text-red-700">확인 내용: {detail}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="primary-action px-5 py-3" onClick={() => window.location.reload()} type="button">다시 불러오기</button>
        <Link className="inline-flex items-center rounded-full border border-[var(--color-border)] px-5 py-3 font-bold" href="/login?next=%2Fdashboard">로그인 화면으로 이동</Link>
      </div>
    </section>
  );
}
