import {
  CROP_RULE_ORDER,
  CROP_RULES,
  MAX_SEEDLINGS,
  SUNLIGHT_HOURS,
  type CropCategory,
} from "../data/crop-rules.ts";
import type { CropId } from "../data/crop-selection.ts";
import type { GardenConfiguration } from "./garden-configuration.ts";

export type CropRecommendation = {
  cropId: CropId;
  seedlingCount: number;
  allocatedWidthCm: number;
  reason: string;
};

export type PlanterRecommendation = {
  id: string;
  label: string;
  crops: CropRecommendation[];
  soilLiters: number;
  soilFillHeightCm: number;
};

export type UnplacedCrop = {
  cropId: CropId;
  reason: string;
};

export type GardenRecommendation = {
  planters: PlanterRecommendation[];
  totalSoilLiters: number;
  totalSeedlings: number;
  summary: string;
  warnings: string[];
  /** 고르긴 했지만 이번 조건에서 넣지 못한 작물과 그 이유 */
  unplacedCrops: UnplacedCrop[];
};

type RecommendationInput = Pick<GardenConfiguration, "planter" | "sunlight"> & {
  /**
   * 사용자가 3단계에서 고른 작물.
   * 예전에는 이 값을 받지 않아서 무엇을 고르든 결과가 같았다.
   * 이제 여기 있는 작물만 후보로 쓰고, 조건이 맞지 않아 빠진 작물은
   * unplacedCrops 로 돌려준다.
   */
  selectedCrops?: readonly CropId[];
};
type ScoredCrop = { cropId: CropId; score: number; sunlightShortfall: boolean };
type Candidate = { cropIds: CropId[]; score: number };

const WALL_THICKNESS_CM = 0.4;
const BOTTOM_STRUCTURE_CM = 2;
const HEAD_SPACE_CM = 3;
const PACKING_FACTOR = 0.85;

const COMPANION_PAIRS = new Set([
  "lettuce|spinach",
  "lettuce|young-radish",
  "spinach|young-radish",
  "green-onion|lettuce",
  "carrot|lettuce",
  "green-onion|tomato",
]);

const SUN_PRIORITY: Record<GardenConfiguration["sunlight"]["duration"], Record<CropId, number>> = {
  "2h": {
    lettuce: 32,
    spinach: 30,
    "young-radish": 26,
    "green-onion": 24,
    carrot: -12,
    tomato: -25,
  },
  "3-5h": {
    lettuce: 25,
    spinach: 23,
    "young-radish": 27,
    "green-onion": 26,
    carrot: 14,
    tomato: 3,
  },
  "6h+": {
    lettuce: 21,
    spinach: 19,
    "young-radish": 24,
    "green-onion": 25,
    carrot: 31,
    tomato: 36,
  },
};

export function createGardenRecommendation({
  planter,
  selectedCrops,
  sunlight,
}: RecommendationInput): GardenRecommendation {
  const safeCount = Math.max(1, Math.floor(planter.count));
  const hours = SUNLIGHT_HOURS[sunlight.duration];
  const innerWidthCm = Math.max(planter.widthCm - WALL_THICKNESS_CM * 2, 1);
  const innerDepthCm = Math.max(planter.depthCm - WALL_THICKNESS_CM * 2, 1);
  const soilFillHeightCm = Math.max(
    planter.heightCm - BOTTOM_STRUCTURE_CM - HEAD_SPACE_CM,
    1,
  );
  const usableSoilPerPlanter = (
    innerWidthCm * innerDepthCm * soilFillHeightCm / 1000
  ) * 0.92;
  const totalSoilLiters = roundUpToNearestFive(usableSoilPerPlanter * safeCount);
  const soilByPlanter = distributeRoundedTotal(totalSoilLiters, safeCount);
  const warnings: string[] = [];

  // 고른 작물이 있으면 그 안에서만 고른다. 없으면(예전 저장값) 전체를 쓴다.
  const wanted = selectedCrops && selectedCrops.length > 0
    ? CROP_RULE_ORDER.filter((cropId) => selectedCrops.includes(cropId))
    : CROP_RULE_ORDER;

  const unplacedCrops: UnplacedCrop[] = [];
  let scoredCrops = wanted
    .map((cropId) => {
      const scored = scoreCrop(cropId, planter, sunlight, hours, innerWidthCm * innerDepthCm);
      if (!scored) unplacedCrops.push({ cropId, reason: rejectionReason(cropId, planter, sunlight, hours) });
      return scored;
    })
    .filter((crop): crop is ScoredCrop => crop !== null)
    .sort(compareScoredCrops);

  if (planter.heightCm < 15) {
    warnings.push("선택한 화분은 모종 재배에 다소 얕아요. 더 깊은 화분이나 어린잎 채소 재배를 권장해요.");
  }

  if (scoredCrops.length === 0) {
    scoredCrops = [
      { cropId: "lettuce", score: 2, sunlightShortfall: hours < 2 },
      { cropId: "spinach", score: 1, sunlightShortfall: hours < 2 },
    ];
    // 대체 작물을 넣었으니 그 둘은 "못 넣은 작물"에서 뺀다.
    for (const fallbackId of ["lettuce", "spinach"] as const) {
      const index = unplacedCrops.findIndex((item) => item.cropId === fallbackId);
      if (index >= 0) unplacedCrops.splice(index, 1);
    }
    warnings.push("현재 조건에서는 상추와 시금치를 제한적으로 추천해요. 화분 깊이나 빛 조건을 보완하면 선택 폭이 넓어져요.");
  }

  const candidates = buildCandidates(scoredCrops, innerWidthCm * innerDepthCm);
  const candidateUseCount = new Map<string, number>();
  const cropUseCount = new Map<CropId, number>();
  const planters: PlanterRecommendation[] = [];

  for (let index = 0; index < safeCount; index += 1) {
    const selected = selectCandidate(candidates, candidateUseCount, cropUseCount);
    const key = candidateKey(selected.cropIds);
    candidateUseCount.set(key, (candidateUseCount.get(key) ?? 0) + 1);
    selected.cropIds.forEach((cropId) => {
      cropUseCount.set(cropId, (cropUseCount.get(cropId) ?? 0) + 1);
    });

    const sortedCropIds = [...selected.cropIds].sort((a, b) => {
      const scoreA = scoredCrops.find((crop) => crop.cropId === a)?.score ?? 0;
      const scoreB = scoredCrops.find((crop) => crop.cropId === b)?.score ?? 0;
      return scoreB - scoreA || CROP_RULE_ORDER.indexOf(a) - CROP_RULE_ORDER.indexOf(b);
    });
    const allocationRatios = sortedCropIds.length === 1 ? [1] : [0.65, 0.35];
    const crops = sortedCropIds.map((cropId, cropIndex) => {
      const rule = CROP_RULES[cropId];
      const allocationRatio = allocationRatios[cropIndex];
      const allocatedArea = innerWidthCm * innerDepthCm * allocationRatio;
      const plantArea = rule.spacingXCm * rule.spacingZCm;
      const seedlingCount = Math.min(
        MAX_SEEDLINGS[cropId],
        Math.max(1, Math.floor((allocatedArea / plantArea) * PACKING_FACTOR)),
      );

      return {
        cropId,
        seedlingCount,
        allocatedWidthCm: roundToOne(innerWidthCm * allocationRatio),
        reason: buildReason(cropId, sunlight, hours),
      };
    });

    planters.push({
      id: `planter-${index + 1}`,
      label: `화분 ${toAlphabeticLabel(index)}`,
      crops,
      soilLiters: soilByPlanter[index],
      soilFillHeightCm: roundToOne(soilFillHeightCm),
    });
  }

  const usedShortfallCrop = planters.some((item) => item.crops.some((crop) => {
    const scored = scoredCrops.find((entry) => entry.cropId === crop.cropId);
    return scored?.sunlightShortfall;
  }));
  if (usedShortfallCrop) {
    warnings.push("일부 작물은 권장 일조량보다 빛이 적을 수 있어 잎과 줄기의 생육을 관찰해 주세요.");
  }

  const indoorFruit = sunlight.location === "indoor" && planters.some((item) => (
    item.crops.some((crop) => CROP_RULES[crop.cropId].category === "fruit")
  ));
  if (indoorFruit) {
    warnings.push("실내에서 열매 작물을 키울 때는 보조 재배등을 권장해요.");
  }

  const totalSeedlings = planters.reduce((gardenTotal, item) => (
    gardenTotal + item.crops.reduce((planterTotal, crop) => planterTotal + crop.seedlingCount, 0)
  ), 0);

  // 조건은 통과했지만 화분 수가 모자라 자리를 못 받은 작물도 알려 준다.
  const placedCropIds = new Set(planters.flatMap((item) => item.crops.map((crop) => crop.cropId)));
  for (const scored of scoredCrops) {
    if (!placedCropIds.has(scored.cropId) && !unplacedCrops.some((item) => item.cropId === scored.cropId)) {
      unplacedCrops.push({
        cropId: scored.cropId,
        reason: `화분 ${safeCount}개로는 자리가 모자라 이번 구성에서 빠졌어요. 화분을 늘리면 넣을 수 있어요.`,
      });
    }
  }

  if (unplacedCrops.length > 0) {
    warnings.push(`고른 작물 중 ${unplacedCrops.length}종은 이번 구성에 넣지 못했어요.`);
  }

  return {
    planters,
    totalSoilLiters: roundToOne(planters.reduce((total, item) => total + item.soilLiters, 0)),
    totalSeedlings,
    summary: `${locationLabel(sunlight.location)}의 ${sunlightLabel(sunlight.duration)} 조건에 맞춰 화분 ${safeCount}개의 첫 재배 구성을 만들었어요.`,
    warnings: [...new Set(warnings)],
    unplacedCrops,
  };
}

function scoreCrop(
  cropId: CropId,
  planter: GardenConfiguration["planter"],
  sunlight: GardenConfiguration["sunlight"],
  hours: number,
  planterAreaCm2: number,
): ScoredCrop | null {
  const rule = CROP_RULES[cropId];
  if (planter.heightCm < rule.minDepthCm) return null;
  if (!rule.allowedLocations.includes(sunlight.location)) return null;

  const shortfall = hours < rule.minSunHours;
  // 빛이 살짝 모자라도 시도해 볼 만한 경우는 남겨 둔다.
  const conditionallyAllowed = hours === 4 && rule.minSunHours === 6;
  if (shortfall && !conditionallyAllowed) return null;

  const withinPreferred = hours >= rule.preferredSunHours[0]
    && hours <= rule.preferredSunHours[1];
  const sunlightScore = shortfall ? -8 : withinPreferred ? 36 : 28;
  const depthScore = 18 + Math.min(planter.heightCm - rule.minDepthCm, 20) * 0.45;
  const plantArea = rule.spacingXCm * rule.spacingZCm;
  const areaScore = Math.min(14, (planterAreaCm2 / plantArea) * 2.5);
  const locationScore = getLocationScore(rule.category, sunlight.location, hours);

  return {
    cropId,
    score: SUN_PRIORITY[sunlight.duration][cropId]
      + sunlightScore
      + depthScore
      + areaScore
      + locationScore,
    sunlightShortfall: shortfall,
  };
}

function getLocationScore(
  category: CropCategory,
  location: GardenConfiguration["sunlight"]["location"],
  hours: number,
) {
  if (location === "balcony") {
    if (category === "fruit") return 18;
    if (category === "root") return 12;
    return 7;
  }

  if (location === "window") {
    if (category === "leafy") return 13;
    if (category === "root") return hours >= 4 ? 8 : -6;
    return hours >= 6 ? 9 : -13;
  }

  // 실내
  if (category === "leafy") return 20;
  if (category === "root") return hours >= 4 ? 2 : -14;
  return hours >= 6 ? -5 : -22;
}

/** 왜 이 작물을 넣지 못했는지 사용자 말로 설명한다. */
function rejectionReason(
  cropId: CropId,
  planter: GardenConfiguration["planter"],
  sunlight: GardenConfiguration["sunlight"],
  hours: number,
): string {
  const rule = CROP_RULES[cropId];
  if (planter.heightCm < rule.minDepthCm) {
    return `깊이 ${rule.minDepthCm}cm 이상이 필요한데 선택한 화분은 ${planter.heightCm}cm예요.`;
  }
  if (!rule.allowedLocations.includes(sunlight.location)) {
    return `${locationLabel(sunlight.location)}에서는 키우기 어려운 작물이에요.`;
  }
  return `하루 ${rule.minSunHours}시간 이상 빛이 필요한데 지금은 약 ${hours}시간이에요.`;
}

function buildCandidates(scoredCrops: readonly ScoredCrop[], planterAreaCm2: number): Candidate[] {
  const candidates: Candidate[] = scoredCrops.map((crop) => ({
    cropIds: [crop.cropId],
    score: crop.score,
  }));

  for (let first = 0; first < scoredCrops.length; first += 1) {
    for (let second = first + 1; second < scoredCrops.length; second += 1) {
      const firstCrop = scoredCrops[first];
      const secondCrop = scoredCrops[second];
      const pair = [firstCrop.cropId, secondCrop.cropId] as const;
      // 열매 작물 둘을 한 화분에 같이 넣지 않는다.
      if (CROP_RULES[firstCrop.cropId].category === "fruit"
        && CROP_RULES[secondCrop.cropId].category === "fruit") continue;

      const minimumPairArea = (
        CROP_RULES[firstCrop.cropId].spacingXCm * CROP_RULES[firstCrop.cropId].spacingZCm
        + CROP_RULES[secondCrop.cropId].spacingXCm * CROP_RULES[secondCrop.cropId].spacingZCm
      ) * 0.85;
      if (planterAreaCm2 < minimumPairArea) continue;

      const key = candidateKey(pair);
      candidates.push({
        cropIds: [...pair],
        score: firstCrop.score + secondCrop.score + (COMPANION_PAIRS.has(key) ? 14 : -7),
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score || candidateKey(a.cropIds).localeCompare(candidateKey(b.cropIds)));
}

function selectCandidate(
  candidates: readonly Candidate[],
  candidateUseCount: ReadonlyMap<string, number>,
  cropUseCount: ReadonlyMap<CropId, number>,
) {
  return [...candidates].sort((a, b) => {
    const adjustedA = adjustedCandidateScore(a, candidateUseCount, cropUseCount);
    const adjustedB = adjustedCandidateScore(b, candidateUseCount, cropUseCount);
    return adjustedB - adjustedA || candidateKey(a.cropIds).localeCompare(candidateKey(b.cropIds));
  })[0];
}

function adjustedCandidateScore(
  candidate: Candidate,
  candidateUseCount: ReadonlyMap<string, number>,
  cropUseCount: ReadonlyMap<CropId, number>,
) {
  const repeatPenalty = (candidateUseCount.get(candidateKey(candidate.cropIds)) ?? 0) * 54;
  const cropPenalty = candidate.cropIds.reduce((total, cropId) => (
    total + (cropUseCount.get(cropId) ?? 0) * 5
  ), 0);
  return candidate.score - repeatPenalty - cropPenalty;
}

function compareScoredCrops(a: ScoredCrop, b: ScoredCrop) {
  return b.score - a.score || CROP_RULE_ORDER.indexOf(a.cropId) - CROP_RULE_ORDER.indexOf(b.cropId);
}

function candidateKey(cropIds: readonly CropId[]) {
  return [...cropIds].sort().join("|");
}

function buildReason(
  cropId: CropId,
  sunlight: GardenConfiguration["sunlight"],
  hours: number,
) {
  const rule = CROP_RULES[cropId];
  if (rule.category === "leafy") {
    return `${locationLabel(sunlight.location)}의 ${hours}시간 빛에서도 비교적 안정적으로 자라는 잎채소예요.`;
  }
  if (rule.category === "root") {
    return `화분 깊이를 활용해 뿌리까지 키울 수 있는 작물이에요. 하루 ${hours}시간 빛이면 시작할 만해요.`;
  }
  return `${locationLabel(sunlight.location)}의 밝은 빛과 충분한 뿌리 공간을 활용하는 열매 작물이에요.`;
}

function distributeRoundedTotal(total: number, count: number) {
  const evenShare = roundToOne(total / count);
  return Array.from({ length: count }, (_, index) => (
    index === count - 1 ? roundToOne(total - evenShare * (count - 1)) : evenShare
  ));
}

function roundUpToNearestFive(value: number) {
  return Math.max(5, Math.ceil(value / 5) * 5);
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function toAlphabeticLabel(index: number) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function locationLabel(location: GardenConfiguration["sunlight"]["location"]) {
  if (location === "balcony") return "베란다";
  if (location === "window") return "창가";
  return "실내";
}

function sunlightLabel(duration: GardenConfiguration["sunlight"]["duration"]) {
  if (duration === "2h") return "하루 2시간";
  if (duration === "3-5h") return "하루 3~5시간";
  return "하루 6시간 이상";
}
