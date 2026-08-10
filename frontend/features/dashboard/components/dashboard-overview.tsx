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
  const cropCatalog = useCropCatalog();

  if (auth.state.status === "error") return <ErrorMessage message={auth.state.message} />;
  if (spacesState.status === "error") return <ErrorMessage message={spacesState.message} />;
  if (seasonsState.status === "error") return <ErrorMessage message={seasonsState.message} />;
  if (layoutsState.status === "error") return <ErrorMessage message={layoutsState.message} />;
  if (tasksState.status === "error") return <ErrorMessage message={tasksState.message} />;
  if (cropCatalog.status === "error") return <ErrorMessage message={cropCatalog.message} />;
  if (cropCatalog.status === "loading") return null;
  if (auth.state.status !== "authenticated") return null;

  const today = formatLocalDateOnly(new Date());
  const summary = createDashboardSummary(
    spacesState.spaces,
    seasonsState.seasons,
    layoutsState.layouts,
    tasksState.tasks,
    today,
  );
  const alerts = createDashboardAlerts(tasksState.tasks, today);
  const registeredPlants = createRegisteredPlantSummaries(
    seasonsState.seasons,
    cropCatalog.crops,
    today,
  );

  return (
    <div>
      <section className="mt-10 sm:mt-14">
        <p className="text-sm font-bold text-leaf">나의 재배 홈</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          {auth.state.user.nickname}님, 오늘도 잘 키워봐요
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          흩어져 있던 공간과 시즌, 작물 배치를 여기에서 이어서 관리할 수 있어요.
        </p>
      </section>

      <section className="mt-8 rounded-[2rem] bg-leaf p-6 text-white shadow-[0_18px_45px_rgba(45,91,54,0.2)] sm:p-8">
        <p className="text-sm font-bold text-white/70">다음 할 일</p>
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

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="재배 현황 요약">
        <SummaryCard label="재배 공간" value={`${summary.spaceCount}개`} />
        <SummaryCard label="전체 시즌" value={`${summary.seasonCount}개`} />
        <SummaryCard label="진행 중" value={`${summary.activeSeasonCount}개`} />
        <SummaryCard label="작물 배치" value={`${summary.layoutCount}개`} />
      </section>

      <DashboardAlertList summary={alerts} />

      <RegisteredPlantList plants={registeredPlants} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-3xl border border-ink/10 bg-white p-6">
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

        <section className="rounded-3xl border border-ink/10 bg-paper p-6">
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
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
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
    <Link className="rounded-2xl border border-ink/10 bg-white p-4 transition hover:border-leaf/30" href={href}>
      <p className="font-bold">{label} <span className="text-leaf" aria-hidden="true">→</span></p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </Link>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="mt-8 rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{message}</p>;
}
