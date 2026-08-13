import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import {
  getGrowingSeasonStatus,
  type GrowingSeason,
  type GrowingSeasonStatus,
} from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";

export interface DashboardSeason {
  id: string;
  name: string;
  spaceName: string;
  status: GrowingSeasonStatus;
  startDate: string;
  endDate: string;
  layoutHref?: string;
  scheduleHref?: string;
}

export interface DashboardNextAction {
  title: string;
  description: string;
  href: string;
  label: string;
}

export interface DashboardSummary {
  spaceCount: number;
  seasonCount: number;
  activeSeasonCount: number;
  layoutCount: number;
  nextAction: DashboardNextAction;
  recentSeasons: DashboardSeason[];
}

export function createDashboardSummary(
  spaces: readonly GrowingSpace[],
  seasons: readonly GrowingSeason[],
  layouts: readonly GardenLayout[],
  tasks: readonly CultivationTask[],
  today: string,
): DashboardSummary {
  const spacesById = new Map(spaces.map((space) => [space.id, space]));
  const layoutsBySeasonId = new Map(
    layouts.map((layout) => [layout.seasonId, layout]),
  );
  const taskSeasonIds = new Set(tasks.map((task) => task.seasonId));
  const dashboardSeasons = seasons
    .map((season) => toDashboardSeason(season, spacesById, layoutsBySeasonId, today))
    .sort(compareDashboardSeasons);
  const activeSeasonCount = dashboardSeasons.filter(
    (season) => season.status === "active",
  ).length;

  return {
    spaceCount: spaces.length,
    seasonCount: seasons.length,
    activeSeasonCount,
    layoutCount: layouts.length,
    nextAction: getNextAction(spaces, seasons, layoutsBySeasonId, taskSeasonIds),
    recentSeasons: dashboardSeasons.slice(0, 3),
  };
}

function toDashboardSeason(
  season: GrowingSeason,
  spacesById: ReadonlyMap<string, GrowingSpace>,
  layoutsBySeasonId: ReadonlyMap<string, GardenLayout>,
  today: string,
): DashboardSeason {
  const space = spacesById.get(season.spaceId);
  const canCreateLayout = space !== undefined
    && !layoutsBySeasonId.has(season.id);
  const canManageSchedule = space !== undefined
    && layoutsBySeasonId.has(season.id);

  return {
    id: season.id,
    name: season.name,
    spaceName: space?.name ?? "연결 공간 없음",
    status: getGrowingSeasonStatus(season, today),
    startDate: season.startDate,
    endDate: season.endDate,
    layoutHref: canCreateLayout ? `/seasons/${season.id}/layout` : undefined,
    scheduleHref: canManageSchedule ? `/seasons/${season.id}/tasks` : undefined,
  };
}

function getNextAction(
  spaces: readonly GrowingSpace[],
  seasons: readonly GrowingSeason[],
  layoutsBySeasonId: ReadonlyMap<string, GardenLayout>,
  taskSeasonIds: ReadonlySet<string>,
): DashboardNextAction {
  if (spaces.length === 0) {
    return {
      title: "첫 재배 공간을 등록해 보세요",
      description: "화분, 베란다 또는 텃밭의 크기와 햇빛 환경부터 기록하면 됩니다.",
      href: "/spaces/new",
      label: "공간 등록하기",
    };
  }

  if (seasons.length === 0) {
    return {
      title: "재배 시즌을 만들어 보세요",
      description: "언제 키울지 정하면 작물 배치와 관리 계획을 이어서 만들 수 있어요.",
      href: "/seasons/new",
      label: "시즌 등록하기",
    };
  }

  const spaceIds = new Set(spaces.map((space) => space.id));
  const seasonWithoutLayout = seasons.find(
    (season) => spaceIds.has(season.spaceId) && !layoutsBySeasonId.has(season.id),
  );
  if (seasonWithoutLayout) {
    return {
      title: `‘${seasonWithoutLayout.name}’ 작물을 배치해 보세요`,
      description: "텃밭 격자를 만들고 심을 작물을 칸마다 배치할 수 있어요.",
      href: `/seasons/${seasonWithoutLayout.id}/layout`,
      label: "작물 배치하기",
    };
  }

  const seasonWithoutTasks = seasons.find(
    (season) => layoutsBySeasonId.has(season.id) && !taskSeasonIds.has(season.id),
  );
  if (seasonWithoutTasks) {
    return {
      title: `‘${seasonWithoutTasks.name}’ 재배 일정을 만들어 보세요`,
      description: "배치한 작물과 시즌 기간을 기준으로 심기와 수확 일정을 준비할 수 있어요.",
      href: `/seasons/${seasonWithoutTasks.id}/tasks`,
      label: "일정 만들기",
    };
  }

  return {
    title: "재배 계획을 이어서 관리해요",
    description: "진행 중인 시즌과 저장된 작물 배치를 확인해 보세요.",
    href: "/seasons",
    label: "시즌 확인하기",
  };
}

function compareDashboardSeasons(
  left: DashboardSeason,
  right: DashboardSeason,
) {
  const statusOrder: Record<GrowingSeasonStatus, number> = {
    active: 0,
    planned: 1,
    completed: 2,
  };
  return statusOrder[left.status] - statusOrder[right.status]
    || right.startDate.localeCompare(left.startDate);
}
