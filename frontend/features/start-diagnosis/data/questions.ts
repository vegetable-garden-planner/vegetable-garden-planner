import type {
  CareTime,
  GrowingGoal,
  SpaceAvailability,
} from "@/features/start-diagnosis/domain/diagnosis";
import type { SunlightExposure } from "@/shared/domain/growing-environment";

export interface DiagnosisOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const SPACE_OPTIONS = [
  { value: "none", label: "아직 공간이 없어요", description: "어디서 어떻게 시작할지부터 알고 싶어요." },
  { value: "indoor", label: "창가나 실내가 있어요", description: "작은 화분 한두 개를 놓을 수 있어요." },
  { value: "balcony", label: "베란다가 있어요", description: "여러 화분이나 화분대를 둘 수 있어요." },
  { value: "outdoor", label: "마당이나 텃밭이 있어요", description: "흙이 있는 야외 공간을 사용할 수 있어요." },
] satisfies readonly DiagnosisOption<SpaceAvailability>[];

export const SUNLIGHT_OPTIONS = [
  { value: "low", label: "거의 들지 않아요", description: "밝지만 직접 햇빛은 2시간 미만이에요." },
  { value: "partial", label: "조금 들어요", description: "하루 약 2~5시간 햇빛이 들어요." },
  { value: "full", label: "충분히 들어요", description: "하루 6시간 이상 햇빛이 들어요." },
] satisfies readonly DiagnosisOption<SunlightExposure>[];

export const CARE_TIME_OPTIONS = [
  { value: "low", label: "주 1회 정도", description: "자주 돌보기 어려워요." },
  { value: "medium", label: "주 2~3회", description: "며칠에 한 번은 상태를 확인할 수 있어요." },
  { value: "high", label: "거의 매일", description: "매일 조금씩 관리하는 것도 좋아요." },
] satisfies readonly DiagnosisOption<CareTime>[];

export const GOAL_OPTIONS = [
  { value: "easy", label: "일단 쉽게 시작하고 싶어요", description: "실패 부담이 적은 식물을 원해요." },
  { value: "edible", label: "먹을 수 있는 걸 키우고 싶어요", description: "채소나 허브를 직접 수확하고 싶어요." },
  { value: "flowers", label: "꽃을 보고 싶어요", description: "공간을 꽃으로 꾸미고 싶어요." },
] satisfies readonly DiagnosisOption<GrowingGoal>[];
