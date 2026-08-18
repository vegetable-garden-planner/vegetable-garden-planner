import { GROWING_SPACE_LABELS } from "../../crop-catalog/data/crop-labels.ts";
import type {
  CropDifficulty,
  CropReference,
} from "@/features/crop-catalog/domain/crop-reference";
import type {
  GrowingSpaceType,
  SunlightExposure,
} from "@/shared/domain/growing-environment";

export type SpaceAvailability = "none" | "indoor" | "balcony" | "outdoor";
export type CareTime = "low" | "medium" | "high";
export type GrowingGoal = "easy" | "edible" | "flowers";

export interface DiagnosisAnswers {
  space: SpaceAvailability;
  sunlight: SunlightExposure;
  careTime: CareTime;
  goal: GrowingGoal;
}

export interface DiagnosisFallback {
  spaceTypeKey: GrowingSpaceType;
  spaceTypeLabel: string;
  message: string;
  crops: readonly CropReference[];
}

export interface DiagnosisRecommendation {
  spaceTypeKey: GrowingSpaceType;
  spaceTypeLabel: string;
  title: string;
  description: string;
  sunlightNote: string;
  careTimeNote: string | null;
  preparation: readonly string[];
  crops: readonly CropReference[];
  fallback: DiagnosisFallback | null;
}

const MAX_RECOMMENDED_CROPS = 3;

const DIFFICULTY_ORDER: Record<CropDifficulty, number> = {
  easy: 0,
  normal: 1,
  challenging: 2,
};

const FALLBACK_SPACE_ORDER: readonly GrowingSpaceType[] = [
  "indoor",
  "balcony",
  "garden",
];

const SPACE_GUIDES: Record<GrowingSpaceType, {
  title: string;
  description: string;
  preparation: readonly string[];
}> = {
  indoor: {
    title: "창가 한쪽이면 충분해요",
    description:
      "큰 공간 없이도 시작할 수 있어요. 햇빛이 드는 위치를 먼저 확인하고 관리하기 쉬운 식물 한두 개부터 키워 보세요.",
    preparation: ["지름 15~20cm 화분", "분갈이용 배양토", "물받침", "물주기 기록"],
  },
  balcony: {
    title: "화분 두세 개로 작은 베란다 정원을 시작해 보세요",
    description:
      "베란다의 햇빛 방향과 바람을 확인하면 잎채소와 허브도 충분히 키울 수 있어요. 옮길 수 있는 화분부터 시작하는 것이 안전해요.",
    preparation: ["배수 구멍이 있는 화분", "채소·허브용 배양토", "물조리개", "햇빛 위치 확인"],
  },
  garden: {
    title: "작은 구역부터 텃밭 계획을 시작해 보세요",
    description:
      "처음부터 전체 공간을 채우기보다 관리할 수 있는 구역만 정하세요. 작물 간격과 계절을 확인하면 시행착오를 줄일 수 있어요.",
    preparation: ["재배 구역 크기 측정", "지역과 일조 시간 확인", "배양토 또는 퇴비", "작물 배치 계획"],
  },
};

const NO_SPACE_TITLE = "작은 화분 하나로 시작해 보세요";

const SUNLIGHT_NOTES: Record<SunlightExposure, string> = {
  low: "직사광선이 하루 2시간 미만이면 잎을 보는 식물이 안전합니다. 열매채소는 햇빛이 더 드는 자리를 만들 수 있을 때 시작하세요.",
  partial: "하루 2~5시간이면 잎채소와 실내에서 키우는 꽃을 무리 없이 관리할 수 있습니다.",
  full: "하루 6시간 이상이면 열매채소까지 시도할 수 있습니다. 대신 여름에는 흙이 마르지 않는지 자주 확인하세요.",
};

const GOAL_NOTES: Record<GrowingGoal, string> = {
  easy: "키울 수 있는 식물",
  edible: "먹을 수 있는 작물",
  flowers: "꽃을 볼 수 있는 식물",
};

const CARE_TIME_RELAXED_NOTE =
  "선택한 관리 시간보다 조금 더 손이 가는 식물입니다. 물주기 일정을 등록해 두면 시기를 놓치지 않을 수 있어요.";

export function isCompleteDiagnosis(
  answers: Partial<DiagnosisAnswers>,
): answers is DiagnosisAnswers {
  return Boolean(
    answers.space && answers.sunlight && answers.careTime && answers.goal,
  );
}

export function resolveSpaceType(space: SpaceAvailability): GrowingSpaceType {
  if (space === "outdoor") return "garden";
  if (space === "balcony") return "balcony";
  return "indoor";
}

export function getRecommendation(
  answers: DiagnosisAnswers,
  crops: readonly CropReference[],
): DiagnosisRecommendation {
  const spaceTypeKey = resolveSpaceType(answers.space);
  const guide = SPACE_GUIDES[spaceTypeKey];
  const inSpace = collectCrops(crops, spaceTypeKey, answers.goal);
  const withinCareTime = inSpace.filter((crop) => matchesCareTime(crop, answers.careTime));
  const matched = withinCareTime.length > 0 ? withinCareTime : inSpace;

  return {
    spaceTypeKey,
    spaceTypeLabel: GROWING_SPACE_LABELS[spaceTypeKey],
    title: answers.space === "none" ? NO_SPACE_TITLE : guide.title,
    description: guide.description,
    sunlightNote: SUNLIGHT_NOTES[answers.sunlight],
    careTimeNote: withinCareTime.length === 0 && inSpace.length > 0
      ? CARE_TIME_RELAXED_NOTE
      : null,
    preparation: guide.preparation,
    crops: matched.slice(0, MAX_RECOMMENDED_CROPS),
    fallback: matched.length > 0
      ? null
      : buildFallback(crops, spaceTypeKey, answers.goal),
  };
}

function collectCrops(
  crops: readonly CropReference[],
  spaceTypeKey: GrowingSpaceType,
  goal: GrowingGoal,
): readonly CropReference[] {
  return sortByDifficulty(crops.filter((crop) =>
    crop.supportedSpaces.includes(spaceTypeKey) && matchesGoal(crop, goal)));
}

function buildFallback(
  crops: readonly CropReference[],
  excludedSpaceTypeKey: GrowingSpaceType,
  goal: GrowingGoal,
): DiagnosisFallback | null {
  for (const spaceTypeKey of FALLBACK_SPACE_ORDER) {
    if (spaceTypeKey === excludedSpaceTypeKey) continue;

    const matched = collectCrops(crops, spaceTypeKey, goal).slice(0, MAX_RECOMMENDED_CROPS);

    if (matched.length > 0) {
      return {
        spaceTypeKey,
        spaceTypeLabel: GROWING_SPACE_LABELS[spaceTypeKey],
        message: `${GROWING_SPACE_LABELS[excludedSpaceTypeKey]}에서 키우는 ${GOAL_NOTES[goal]} 기준정보는 아직 준비하지 못했어요. ${GROWING_SPACE_LABELS[spaceTypeKey]}까지 넓히면 지금 바로 시작할 수 있습니다.`,
        crops: matched,
      };
    }
  }

  return null;
}

function matchesGoal(crop: CropReference, goal: GrowingGoal): boolean {
  if (goal === "flowers") return crop.category === "flower";
  if (goal === "edible") return crop.category !== "flower";
  return true;
}

function matchesCareTime(crop: CropReference, careTime: CareTime): boolean {
  if (careTime === "high") return true;
  if (careTime === "medium") return crop.difficulty !== "challenging";
  return crop.difficulty === "easy";
}

function sortByDifficulty(crops: readonly CropReference[]): CropReference[] {
  return [...crops].sort((left, right) =>
    DIFFICULTY_ORDER[left.difficulty] - DIFFICULTY_ORDER[right.difficulty]
    || left.name.localeCompare(right.name, "ko-KR"));
}
