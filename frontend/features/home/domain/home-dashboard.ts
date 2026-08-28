import { CROP_PHOTOS } from "../../crop-catalog/data/crop-photos.ts";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CultivationTask, CultivationTaskType } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import { getGrowingSeasonStatus, type GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";

const DAY_MS = 86_400_000;

export interface HomeTask {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
}

export interface HomeRecommendation {
  id: string;
  name: string;
  description: string;
  image: string;
  href: string;
}

export interface HomeDashboardModel {
  cropCount: number;
  primaryCrop: CropReference | null;
  primarySeason: GrowingSeason | null;
  primarySpace: GrowingSpace | null;
  growingDay: number;
  progress: number;
  daysUntilHarvest: number | null;
  todayTaskCount: number;
  tasks: HomeTask[];
  recommendations: HomeRecommendation[];
}

const TASK_ICONS: Record<CultivationTaskType, string> = {
  watering: "물",
  sowing: "씨",
  transplanting: "모",
  fertilizing: "비",
  support: "대",
  harvest: "수",
  other: "잎",
};

/** 추천 작물 카드에 쓰는 사진. 사용자가 제공한 asset 만 쓴다. */
const CROP_IMAGES = CROP_PHOTOS;

export function createHomeDashboardModel(
  spaces: readonly GrowingSpace[],
  seasons: readonly GrowingSeason[],
  layouts: readonly GardenLayout[],
  tasks: readonly CultivationTask[],
  crops: readonly CropReference[],
  today: string,
  containerPlacements: readonly { seasonId: string; cropId: string }[] = [],
): HomeDashboardModel {
  const primarySeason = selectPrimarySeason(seasons, today);
  const primarySpace = primarySeason
    ? spaces.find((space) => space.id === primarySeason.spaceId) ?? null
    : null;
  const primaryLayout = primarySeason
    ? layouts.find((layout) => layout.seasonId === primarySeason.id)
    : undefined;
  const primaryContainerCropId = primarySeason
    ? containerPlacements.find((item) => item.seasonId === primarySeason.id)?.cropId
    : undefined;
  const plantedCropIds = new Set(layouts.flatMap((layout) => layout.placements.map((item) => item.cropId)));
  for (const placement of containerPlacements) plantedCropIds.add(placement.cropId);
  for (const season of seasons) {
    if (season.featuredCropId) plantedCropIds.add(season.featuredCropId);
  }
  const primaryCropId = primarySeason?.featuredCropId
    ?? primaryContainerCropId
    ?? primaryLayout?.placements[0]?.cropId
    ?? "";
  const primaryCrop = crops.find((crop) => crop.id === primaryCropId) ?? null;
  const pendingTasks = tasks
    .filter((task) => task.status === "pending")
    .sort(compareTasks);
  const todayTaskCount = pendingTasks.filter((task) => task.dueDate <= today).length;
  const visibleTasks = pendingTasks
    .filter((task) => daysBetween(today, task.dueDate) <= 7)
    .slice(0, 3)
    .map(toHomeTask);
  const harvestTask = primarySeason
    ? pendingTasks.find((task) => task.seasonId === primarySeason.id && task.type === "harvest")
    : undefined;

  return {
    cropCount: plantedCropIds.size,
    primaryCrop,
    primarySeason,
    primarySpace,
    growingDay: primarySeason ? Math.max(0, daysBetween(primarySeason.startDate, today) + 1) : 0,
    progress: primarySeason ? calculateProgress(primarySeason, today) : 0,
    daysUntilHarvest: harvestTask ? daysBetween(today, harvestTask.dueDate) : null,
    todayTaskCount,
    tasks: visibleTasks,
    recommendations: createRecommendations(crops, primarySpace, plantedCropIds),
  };
}

function selectPrimarySeason(seasons: readonly GrowingSeason[], today: string) {
  return [...seasons].sort((left, right) => {
    const statusOrder = { active: 0, planned: 1, completed: 2 };
    const statusDifference = statusOrder[getGrowingSeasonStatus(left, today)]
      - statusOrder[getGrowingSeasonStatus(right, today)];
    return statusDifference || right.startDate.localeCompare(left.startDate);
  })[0] ?? null;
}

/** 재배 진행률(0~100). 새 홈의 재배 카드에서도 같은 계산을 쓴다. */
export function calculateProgress(season: GrowingSeason, today: string) {
  const totalDays = Math.max(1, daysBetween(season.startDate, season.endDate) + 1);
  const elapsedDays = daysBetween(season.startDate, today) + 1;
  return Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
}

function toHomeTask(task: CultivationTask): HomeTask {
  return {
    id: task.id,
    icon: TASK_ICONS[task.type],
    title: task.title,
    description: task.notes || `${task.dueDate}까지 확인해 주세요.`,
    href: `/seasons/${task.seasonId}/tasks`,
  };
}

function createRecommendations(
  crops: readonly CropReference[],
  space: GrowingSpace | null,
  plantedCropIds: ReadonlySet<string>,
) {
  return crops
    .filter((crop) => !plantedCropIds.has(crop.id))
    .filter((crop) => !space || crop.supportedSpaces.includes(space.type))
    .sort((left, right) => difficultyOrder(left) - difficultyOrder(right) || left.name.localeCompare(right.name, "ko-KR"))
    .slice(0, 3)
    .map((crop): HomeRecommendation => ({
      id: crop.id,
      name: crop.name,
      description: crop.summary,
      image: CROP_IMAGES[crop.id] ?? "/figma/image8.webp",
      href: `/crops/${crop.id}`,
    }));
}

function difficultyOrder(crop: CropReference) {
  return { easy: 0, normal: 1, challenging: 2 }[crop.difficulty];
}

function compareTasks(left: CultivationTask, right: CultivationTask) {
  return left.dueDate.localeCompare(right.dueDate)
    || left.title.localeCompare(right.title, "ko-KR");
}

/** 두 날짜(YYYY-MM-DD) 사이의 일수. 재배 일수·D-day 계산에 함께 쓴다. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);
}
