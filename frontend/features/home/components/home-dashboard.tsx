"use client";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { useCultivationTasks } from "@/features/cultivation-schedule/hooks/use-cultivation-tasks";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import {
  createHomeDashboardModel,
  type HomeDashboardModel,
} from "@/features/home/domain/home-dashboard";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { HomeDashboardView } from "./home-dashboard-view";

export function HomeDashboard() {
  const auth = useAuthSession();
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const layoutsState = useGardenLayouts();
  const tasksState = useCultivationTasks();
  const cropCatalog = useCropCatalog();
  const now = new Date();
  const today = formatLocalDate(now);
  const authenticated = auth.state.status === "authenticated";
  const resourcesReady = spacesState.status === "ready"
    && seasonsState.status === "ready"
    && layoutsState.status === "ready"
    && tasksState.status === "ready"
    && cropCatalog.status === "ready";
  const model = resourcesReady
    ? createHomeDashboardModel(
        spacesState.spaces,
        seasonsState.seasons,
        layoutsState.layouts,
        tasksState.tasks,
        cropCatalog.crops,
        today,
      )
    : createHomeDashboardModel([], [], [], [], cropCatalog.crops, today);
  const dataError = authenticated
    ? [spacesState, seasonsState, layoutsState, tasksState, cropCatalog]
        .find((state) => state.status === "error")
    : undefined;
  const resourcesLoading = authenticated && !resourcesReady && !dataError;
  const nickname = auth.state.status === "authenticated" ? auth.state.user.nickname : "새싹";
  const nextHref = createNextHref(model);
  const harvest = createHarvestPresentation(model, resourcesLoading);

  return (
    <HomeDashboardView
      authenticated={authenticated}
      authLoading={auth.state.status === "loading"}
      dataError={dataError?.status === "error" ? dataError.message : undefined}
      harvestCopy={harvest.copy}
      harvestValue={harvest.value}
      model={model}
      nextHref={nextHref}
      nickname={nickname}
      now={now}
      resourcesLoading={resourcesLoading}
    />
  );
}

function createNextHref(model: HomeDashboardModel): string {
  if (model.primarySeason) return `/seasons/${model.primarySeason.id}/tasks`;
  if (model.primarySpace) {
    return `/seasons/new?spaceId=${encodeURIComponent(model.primarySpace.id)}`;
  }
  return "/spaces/new";
}

function createHarvestPresentation(
  model: HomeDashboardModel,
  resourcesLoading: boolean,
): { copy: string; value: string } {
  if (resourcesLoading) return { copy: "재배 현황을", value: "불러오고 있어요" };
  if (model.daysUntilHarvest !== null && model.daysUntilHarvest < 0) {
    return { copy: "수확 예정일이", value: `${Math.abs(model.daysUntilHarvest)}일 지났어요` };
  }
  if (model.daysUntilHarvest === 0) {
    return { copy: "오늘은", value: "수확 예정일이에요" };
  }
  if (model.daysUntilHarvest !== null) {
    return { copy: "수확까지", value: `${model.daysUntilHarvest}일` };
  }
  return model.primarySeason
    ? { copy: "다음 일정을", value: "확인해 보세요" }
    : { copy: "첫 공간을", value: "등록해 보세요" };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
