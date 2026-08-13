import type {
  GrowingSpaceType,
  SunlightExposure,
} from "@/shared/domain/growing-environment";

export const SPACE_TYPE_OPTIONS: readonly {
  value: GrowingSpaceType;
  label: string;
  description: string;
}[] = [
  { value: "indoor", label: "실내 화분", description: "창가, 책상, 선반처럼 작은 실내 공간" },
  { value: "balcony", label: "베란다", description: "여러 화분이나 화분대를 둘 수 있는 공간" },
  { value: "garden", label: "마당·텃밭", description: "흙이 있거나 재배 구역을 만들 수 있는 야외 공간" },
];

export const SUNLIGHT_OPTIONS: readonly {
  value: SunlightExposure;
  label: string;
}[] = [
  { value: "low", label: "2시간 미만" },
  { value: "partial", label: "2~5시간" },
  { value: "full", label: "6시간 이상" },
];

export const SPACE_SIZE_PRESETS = [
  { label: "작은 창가", description: "화분 2~3개", widthCm: 60, lengthCm: 30 },
  { label: "화분대", description: "선반이나 작은 베란다", widthCm: 120, lengthCm: 60 },
  { label: "넓은 베란다", description: "여러 화분과 이동 공간", widthCm: 300, lengthCm: 100 },
] as const;
