import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import {
  distanceCm,
  growthWidthCm,
  isCellTaken,
  type StudioPlacement,
  type StudioPlanter,
  type StudioState,
} from "./studio-model.ts";

/**
 * 재배 조건 검증
 *
 * 전부 프론트엔드 규칙으로만 계산한다. AI 를 쓰지 않는다.
 * 판단 근거는 실제로 저장된 값뿐이다.
 *   작물: plantSpacingCm · minPotDepthCm · sunRequirement · plantingPeriod
 *         · needsSupport · plantingMaterial · supportedSpaces
 *   화분: widthCm/lengthCm/depthCm · sunlight · type
 *   계획: startDate (시즌 판정)
 *
 * 기준 값이 없으면 그 항목은 "확인"으로 두고 임의의 숫자를 만들지 않는다.
 */

export type CheckStatus = "good" | "warning" | "bad" | "info";
export type OverallStatus = "good" | "warning" | "bad";

export interface Validation {
  overall: OverallStatus;
  score: number;
  depth: CheckStatus;
  sun: CheckStatus;
  season: CheckStatus;
  spacing: CheckStatus;
  support: CheckStatus;
  /** 가장 가까운 이웃까지의 실제 거리(cm). 이웃이 없으면 null */
  nearest: number | null;
  nearestName: string;
  /** 필요한 간격(cm) */
  need: number;
  depthDiff: number | null;
}

export interface ValidationInput {
  state: StudioState;
  cropsById: ReadonlyMap<string, CropReference>;
}

const SUN_ORDER: Record<string, number> = { low: 0, partial: 1, full: 2 };

export const SUN_LABELS: Record<string, string> = {
  low: "2시간 미만",
  partial: "2~5시간",
  full: "6시간 이상",
};

export const SPACE_LABELS: Record<string, string> = {
  indoor: "실내 화분",
  balcony: "베란다",
  garden: "마당·텃밭",
};

/** 줄 재배(씨앗을 촘촘히 뿌리는 작물)는 권장 간격을 그대로 요구하지 않는다. */
export function spacingNeed(crop: CropReference): number {
  return crop.plantingMaterial === "seed"
    ? Math.max(5, crop.plantSpacingCm * 0.55)
    : crop.plantSpacingCm;
}

export function plantingLabel(crop: CropReference): string {
  switch (crop.plantingMaterial) {
    case "seed": return "씨앗 · 줄 파종";
    case "seedling": return "모종 · 개별 포기";
    case "seed-potato": return "씨감자 · 뿌리 작물";
    case "potted-plant": return "화분 식물";
    case "cut-flower": return "절화 · 화훼";
    default: return "개별 포기";
  }
}

export function supportLabel(crop: CropReference): string {
  return crop.needsSupport ? "지지 구조 필요" : "추가 구조물 없음";
}

export function statusText(status: CheckStatus): string {
  return status === "good" ? "적합" : status === "warning" ? "주의" : status === "bad" ? "부적합" : "확인";
}

export function statusIcon(status: CheckStatus): string {
  return status === "good" ? "✓" : status === "warning" ? "!" : status === "bad" ? "×" : "i";
}

/**
 * 특정 칸에 이 작물을 놓았을 때의 조건을 검사한다.
 * 실제로 놓지 않고도 계산할 수 있어서 추천 위치 계산에도 그대로 쓴다.
 */
export function validateCandidate(
  input: ValidationInput,
  cropId: string,
  planter: StudioPlanter,
  col: number,
  row: number,
  ignoreId?: string,
): Validation | null {
  const crop = input.cropsById.get(cropId);
  if (!crop) return null;

  const depthDiff = planter.d === null || crop.minPotDepthCm === null
    ? null
    : planter.d - crop.minPotDepthCm;
  const depth: CheckStatus = depthDiff === null
    ? "info"
    : depthDiff >= 0 ? "good" : depthDiff >= -5 ? "warning" : "bad";

  const sun = checkSun(crop, planter);
  // 계절 판정 기준은 그 화분이 속한 계획의 시작 월이다. 계획마다 다르다.
  const season = checkSeason(crop, planter.seasonMonth);
  const { spacing, nearest, nearestName, need } = checkSpacing(input, crop, planter, col, row, ignoreId);
  const support: CheckStatus = crop.needsSupport ? "info" : "good";

  const critical: CheckStatus[] = [depth, sun, spacing];
  const overall: OverallStatus = critical.includes("bad")
    ? "bad"
    : critical.includes("warning") || season === "warning" ? "warning" : "good";

  let score = 100;
  if (depth === "warning") score -= 15;
  if (depth === "bad") score -= 35;
  if (sun === "warning") score -= 15;
  if (sun === "bad") score -= 35;
  if (spacing === "warning") score -= 18;
  if (spacing === "bad") score -= 38;
  if (season === "warning") score -= 10;

  return {
    overall, score: Math.max(0, score),
    depth, sun, season, spacing, support,
    nearest, nearestName, need, depthDiff,
  };
}

export function validatePlacement(
  input: ValidationInput,
  placement: StudioPlacement,
): Validation | null {
  const planter = input.state.planters.find((item) => item.id === placement.planterId);
  if (!planter) return null;
  return validateCandidate(input, placement.cropId, planter, placement.col, placement.row, placement.id);
}

function checkSun(crop: CropReference, planter: StudioPlanter): CheckStatus {
  const have = SUN_ORDER[planterSunKey(planter)];
  if (crop.sunRequirement === null) return "info";
  if (have === undefined) return "warning";

  const need = SUN_ORDER[crop.sunRequirement];
  if (need === undefined) return "info";
  if (have >= need) return "good";
  return need - have >= 2 ? "bad" : "warning";
}

/** 화분에 저장된 햇빛 값. 값이 없으면 판단하지 않는다. */
export function planterSunKey(planter: StudioPlanter): string {
  return planter.sun;
}

function checkSeason(crop: CropReference, month: number | null): CheckStatus {
  if (month === null) return "info";
  const { startMonth, endMonth } = crop.plantingPeriod;
  const inside = startMonth <= endMonth
    ? month >= startMonth && month <= endMonth
    : month >= startMonth || month <= endMonth;
  return inside ? "good" : "warning";
}

function checkSpacing(
  input: ValidationInput,
  crop: CropReference,
  planter: StudioPlanter,
  col: number,
  row: number,
  ignoreId?: string,
) {
  const need = spacingNeed(crop);
  let nearest: number | null = null;
  let nearestName = "";

  for (const other of input.state.placements) {
    if (other.planterId !== planter.id) continue;
    if (other.id === ignoreId) continue;
    if (other.col === col && other.row === row) continue;

    const gap = distanceCm(planter, { col, row }, other);
    if (nearest === null || gap < nearest) {
      nearest = gap;
      nearestName = input.cropsById.get(other.cropId)?.name ?? "다른 작물";
    }
  }

  let spacing: CheckStatus = "good";
  if (nearest !== null) {
    spacing = nearest >= need ? "good" : nearest >= need * 0.7 ? "warning" : "bad";
  }

  return { spacing, nearest, nearestName, need };
}

/** 검증 결과를 사람이 읽는 한 문장으로 만든다. 실제 수치만 넣는다. */
export function validationMessage(
  validation: Validation,
  crop: CropReference,
  planter: StudioPlanter,
): string {
  const lines: string[] = [];

  if (validation.spacing !== "good" && validation.nearest !== null) {
    lines.push(`가장 가까운 ${validation.nearestName}과(와) 약 ${Math.round(validation.nearest)}cm로 권장 간격 ${Math.round(validation.need)}cm보다 좁습니다.`);
  }
  if (validation.depth === "warning" || validation.depth === "bad") {
    lines.push(`화분 깊이 ${planter.d}cm가 권장 깊이 ${crop.minPotDepthCm}cm보다 부족합니다.`);
  }
  if (validation.sun === "warning" || validation.sun === "bad") {
    lines.push(`${crop.name}에는 ${SUN_LABELS[crop.sunRequirement ?? ""] ?? "더 긴 일조"}가 필요한데 이 화분은 ${SUN_LABELS[planter.sun] ?? "정보 없음"}입니다.`);
  }
  if (validation.season === "warning") {
    lines.push(`${crop.plantingPeriod.label || `${crop.plantingPeriod.startMonth}~${crop.plantingPeriod.endMonth}월`}에 심는 작물이라 시기를 확인하는 편이 좋습니다.`);
  }

  return lines.slice(0, 2).join(" ")
    || `${crop.name}의 기본 재배 조건이 현재 위치와 잘 맞습니다.`;
}

/* ------------------------------------------------------------ 추천 위치 */

export interface RecommendedCell {
  planterId: string;
  col: number;
  row: number;
  score: number;
  status: OverallStatus;
  rank: number;
  validation: Validation;
}

/**
 * 같은 재배 계획의 모든 화분에서 빈 칸을 검사해 더 나은 자리를 찾는다.
 * "비어 있으니 놓을 수 있다"가 아니라 간격·깊이·햇빛·계절을 함께 본다.
 *
 * 캔버스에는 다른 계획의 화분도 함께 보이지만, 작물을 그쪽으로 옮길 수는 없으므로
 * 추천 대상에서 제외한다. (계획 사이로 배치를 옮기는 API 가 없다)
 */
export function recommendForCrop(
  input: ValidationInput,
  cropId: string,
  sourceId?: string,
  limit = 7,
): RecommendedCell[] {
  const found: Omit<RecommendedCell, "rank">[] = [];
  const source = sourceId
    ? input.state.placements.find((item) => item.id === sourceId)
    : undefined;

  for (const planter of input.state.planters) {
    // 배치는 계획별로 저장되고 계획을 넘나드는 이동 API 가 없다.
    // 그래서 옮길 수 없는 자리는 추천하지 않는다.
    if (source && planter.seasonId !== source.seasonId) continue;
    collectCells(input, cropId, planter, sourceId, found);
  }

  return found
    .sort((left, right) => right.score - left.score
      || left.planterId.localeCompare(right.planterId)
      || left.row - right.row
      || left.col - right.col)
    .slice(0, limit)
    .map((cell, index) => ({ ...cell, rank: index + 1 }));
}

/** 화분 하나의 빈 칸을 전부 검사해 후보 목록에 담는다. */
function collectCells(
  input: ValidationInput,
  cropId: string,
  planter: StudioPlanter,
  sourceId: string | undefined,
  found: Omit<RecommendedCell, "rank">[],
): void {
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < planter.rows; row += 1) {
    for (let col = 0; col < planter.cols; col += 1) cells.push({ col, row });
  }

  for (const cell of cells) {
    if (isCellTaken(input.state, planter.id, cell.col, cell.row, sourceId)) continue;
    const validation = validateCandidate(input, cropId, planter, cell.col, cell.row, sourceId);
    if (!validation) continue;
    found.push({
      planterId: planter.id,
      col: cell.col,
      row: cell.row,
      score: validation.score,
      status: validation.overall,
      validation,
    });
  }
}

export interface ValidationCounts { good: number; warning: number; bad: number }

export function countValidations(input: ValidationInput): ValidationCounts {
  const counts: ValidationCounts = { good: 0, warning: 0, bad: 0 };
  for (const placement of input.state.placements) {
    const validation = validatePlacement(input, placement);
    if (validation) counts[validation.overall] += 1;
  }
  return counts;
}

/** 자란 뒤 필요한 폭 — 화면 표시용으로 재수출한다. */
export { growthWidthCm };
