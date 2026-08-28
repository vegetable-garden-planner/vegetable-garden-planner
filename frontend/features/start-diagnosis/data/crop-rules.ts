import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import { MVP_CROP_IDS, type CropId } from "./crop-selection.ts";

/**
 * 추천 계산에 쓰는 작물 규칙
 *
 * 간격·최소 깊이·필요 일조량은 서비스 기준 데이터(CROP_REFERENCES)에서 그대로 가져온다.
 * 예전에는 이 파일이 같은 값을 따로 들고 있어서 두 벌이 어긋났다.
 *
 * 여기서 직접 정하는 것은 진단 전용 값 세 가지뿐이다.
 *   - 화분 한 개에 넣을 최대 포기 수
 *   - 빛 조건별 우선순위 점수
 *   - 궁합이 좋은 조합
 */

export type CropCategory = "leafy" | "root" | "fruit";
export type CropLocation = "balcony" | "window" | "indoor";

export type CropRule = {
  name: string;
  minDepthCm: number;
  minSunHours: number;
  preferredSunHours: readonly [number, number];
  spacingXCm: number;
  spacingZCm: number;
  allowedLocations: readonly CropLocation[];
  category: CropCategory;
};

export const SUNLIGHT_HOURS = {
  "2h": 2,
  "3-5h": 4,
  "6h+": 6,
} as const;

/** 서비스의 일조 등급을 진단에서 쓰는 시간으로 옮긴다. */
const SUN_HOURS_BY_REQUIREMENT = {
  low: 2,
  partial: 3,
  full: 6,
} as const;

const PREFERRED_RANGE_BY_REQUIREMENT = {
  low: [2, 4],
  partial: [3, 6],
  full: [6, 8],
} as const;

/** 서비스 분류를 추천 계산이 쓰는 세 갈래로 좁힌다. */
function toRuleCategory(reference: CropReference): CropCategory {
  if (reference.category === "fruit") return "fruit";
  if (reference.category === "root" || reference.category === "tuber") return "root";
  return "leafy";
}

/**
 * 어디에 둘 수 있는지.
 * 서비스 데이터의 supportedSpaces(indoor·balcony·garden)를
 * 진단이 쓰는 위치(베란다·창가·실내)로 옮긴다.
 * 창가는 실내이면서 빛이 드는 자리라 balcony 또는 indoor 어느 쪽이든 허용한다.
 */
function toAllowedLocations(reference: CropReference): readonly CropLocation[] {
  const locations: CropLocation[] = [];
  if (reference.supportedSpaces.includes("balcony")) locations.push("balcony", "window");
  if (reference.supportedSpaces.includes("indoor")) {
    if (!locations.includes("window")) locations.push("window");
    locations.push("indoor");
  }
  // 빛만 충분하면 실내에서도 시도할 수 있으므로, 잎채소는 실내를 열어 둔다.
  if (!locations.includes("indoor") && toRuleCategory(reference) === "leafy") {
    locations.push("indoor");
  }
  return locations;
}

function buildRule(reference: CropReference): CropRule {
  const requirement = reference.sunRequirement ?? "partial";
  const spacing = Math.max(5, reference.plantSpacingCm);

  return {
    name: reference.name,
    minDepthCm: reference.minPotDepthCm ?? 15,
    minSunHours: SUN_HOURS_BY_REQUIREMENT[requirement],
    preferredSunHours: PREFERRED_RANGE_BY_REQUIREMENT[requirement],
    spacingXCm: spacing,
    spacingZCm: spacing,
    allowedLocations: toAllowedLocations(reference),
    category: toRuleCategory(reference),
  };
}

const REFERENCE_BY_ID = new Map(CROP_REFERENCES.map((crop) => [crop.id, crop]));

export const CROP_RULES: Readonly<Record<CropId, CropRule>> = Object.fromEntries(
  MVP_CROP_IDS.map((id) => {
    const reference = REFERENCE_BY_ID.get(id);
    if (!reference) throw new Error(`작물 기준 정보를 찾을 수 없습니다: ${id}`);
    return [id, buildRule(reference)];
  }),
) as Record<CropId, CropRule>;

/** 화분 하나에 넣을 최대 포기 수. 자리보다 관리 부담을 기준으로 잡았다. */
export const MAX_SEEDLINGS: Readonly<Record<CropId, number>> = {
  lettuce: 8,
  spinach: 10,
  "young-radish": 10,
  "green-onion": 12,
  carrot: 8,
  tomato: 2,
};

/** 추천 순서의 기본값. 쉬운 잎채소를 앞에 둔다. */
export const CROP_RULE_ORDER: readonly CropId[] = [
  "lettuce",
  "spinach",
  "young-radish",
  "green-onion",
  "carrot",
  "tomato",
];
