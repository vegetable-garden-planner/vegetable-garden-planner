import type { GrowingSpaceInput } from "../../growing-space/domain/growing-space.ts";
import type { GrowingSeasonInput } from "../../growing-season/domain/growing-season.ts";
import type { ContainerPlacementInput } from "../../container-placement/domain/container-placement.ts";
import type { GardenConfiguration } from "./garden-configuration.ts";
import type { GardenRecommendation } from "./garden-recommendation.ts";

/**
 * 진단 결과를 실제 저장할 모양으로 옮긴다.
 *
 * 예전에는 추천을 만들어 놓고도 공간 폼에 크기 몇 개만 채워 넣고 끝나서
 * 화분 개수도, 고른 작물도, 추천 배치도 모두 버려졌다.
 *
 * 여기서는 화분 개수만큼 공간을 만들고, 재배 계획 하나를 붙이고,
 * 추천된 작물과 포기 수를 그대로 배치로 옮긴다.
 * 순수 함수라 저장 전에 결과를 그대로 확인할 수 있다.
 */

const SEASON_LENGTH_DAYS = 90;

export interface PlanDraft {
  spaces: GrowingSpaceInput[];
  season: Omit<GrowingSeasonInput, "spaceId">;
  /** 화분 순서(planters[i])에 대응한다. 공간을 만든 뒤 spaceId를 채운다. */
  placementsByPlanter: { cropId: string; quantity: number }[][];
}

/** 진단의 위치를 서비스의 공간 종류로 옮긴다. */
export function toSpaceType(location: GardenConfiguration["sunlight"]["location"]) {
  return location === "balcony" ? "balcony" as const : "indoor" as const;
}

/** 진단의 빛 시간을 서비스의 일조 등급으로 옮긴다. */
export function toSunlightExposure(duration: GardenConfiguration["sunlight"]["duration"]) {
  if (duration === "2h") return "low" as const;
  if (duration === "6h+") return "full" as const;
  return "partial" as const;
}

export function createPlanDraft(
  configuration: GardenConfiguration,
  recommendation: GardenRecommendation,
  today: string,
): PlanDraft {
  const spaceType = toSpaceType(configuration.sunlight.location);
  const sunlight = toSunlightExposure(configuration.sunlight.duration);
  const { planter } = configuration;

  const spaces: GrowingSpaceInput[] = recommendation.planters.map((item) => ({
    name: item.label,
    type: spaceType,
    sunlight,
    widthCm: planter.widthCm,
    lengthCm: planter.depthCm,
    depthCm: planter.heightCm,
    address: null,
    latitude: null,
    longitude: null,
    orientation: null,
    shadeLevel: null,
    estimatedSunlightHours: null,
    notes: "",
  }));

  const firstCropId = recommendation.planters[0]?.crops[0]?.cropId ?? null;

  return {
    spaces,
    season: {
      name: "첫 재배 계획",
      startDate: today,
      endDate: addDays(today, SEASON_LENGTH_DAYS),
      notes: recommendation.summary,
      featuredCropId: firstCropId,
    },
    placementsByPlanter: recommendation.planters.map((item) => (
      item.crops.map((crop) => ({ cropId: crop.cropId, quantity: crop.seedlingCount }))
    )),
  };
}

/** 만든 공간 순서에 맞춰 배치 입력을 완성한다. */
export function toPlacementInputs(
  draft: PlanDraft,
  spaceIds: readonly string[],
): ContainerPlacementInput[] {
  const inputs: ContainerPlacementInput[] = [];
  let order = 0;

  draft.placementsByPlanter.forEach((crops, planterIndex) => {
    const spaceId = spaceIds[planterIndex];
    if (!spaceId) return;
    for (const crop of crops) {
      inputs.push({ spaceId, cropId: crop.cropId, quantity: crop.quantity, position: { order } });
      order += 1;
    }
  });

  return inputs;
}

export function addDays(date: string, days: number): string {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}
