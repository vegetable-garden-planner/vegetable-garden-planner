export interface GrowingSeasonFormValues {
  spaceId: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface GrowingSeasonInput extends GrowingSeasonFormValues {
  featuredCropId?: string | null;
}

export interface GrowingSeason extends GrowingSeasonInput {
  id: string;
  createdAt: string;
}

export interface PersistedGrowingSeason extends GrowingSeason {
  status: GrowingSeasonStatus;
  version: number;
  updatedAt: string;
}

export type GrowingSeasonField = keyof GrowingSeasonFormValues;
export type GrowingSeasonErrors = Partial<Record<GrowingSeasonField, string>>;

export type GrowingSeasonValidation =
  | { valid: true; value: GrowingSeasonInput }
  | { valid: false; errors: GrowingSeasonErrors };

export type GrowingSeasonStatus = "planned" | "active" | "completed";

const MAX_SEASON_DURATION_DAYS = 730;
const DAY_IN_MILLISECONDS = 86_400_000;

export function validateGrowingSeason(
  values: GrowingSeasonFormValues,
  registeredSpaceIds: readonly string[],
  existingSeasons: readonly GrowingSeason[] = [],
  editingSeasonId?: string,
): GrowingSeasonValidation {
  const errors: GrowingSeasonErrors = {};
  const name = values.name.trim();
  const notes = values.notes.trim();
  const startTimestamp = parseDateOnly(values.startDate);
  const endTimestamp = parseDateOnly(values.endDate);

  if (!registeredSpaceIds.includes(values.spaceId)) {
    errors.spaceId = "등록된 재배 공간을 선택해 주세요.";
  }
  if (name.length < 2 || name.length > 30) {
    errors.name = "재배 계획 이름은 2자 이상 30자 이하로 입력해 주세요.";
  }
  if (startTimestamp === null) {
    errors.startDate = "올바른 시작일을 입력해 주세요.";
  }
  if (endTimestamp === null) {
    errors.endDate = "올바른 종료일을 입력해 주세요.";
  }

  if (startTimestamp !== null && endTimestamp !== null) {
    validateDateRange(startTimestamp, endTimestamp, errors);
    if (
      !errors.endDate
      && hasOverlappingSeason(
        values.spaceId,
        startTimestamp,
        endTimestamp,
        existingSeasons,
        editingSeasonId,
      )
    ) {
      errors.startDate = "같은 공간에 기간이 겹치는 재배 계획이 있습니다.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      spaceId: values.spaceId,
      name,
      startDate: values.startDate,
      endDate: values.endDate,
      notes,
    },
  };
}

export function getGrowingSeasonStatus(
  season: Pick<GrowingSeason, "startDate" | "endDate">,
  today: string,
): GrowingSeasonStatus {
  if (today < season.startDate) return "planned";
  if (today > season.endDate) return "completed";
  return "active";
}

export function createGrowingSeason(
  input: GrowingSeasonInput,
  id: string,
  createdAt: string,
): GrowingSeason {
  return { ...input, id, createdAt };
}

export interface SeasonPeriodSuggestion {
  startDate: string;
  endDate: string;
}

interface SuggestableCropPeriod {
  startMonth: number;
  endMonth: number;
}

/**
 * 작물의 권장 심기·수확 달을 모두 포함하는 기간을 오늘 이후 가장 가까운 시점으로 제안한다.
 * 권장 시기가 연말을 넘기면(예: 11월~2월) 하나의 기간으로 묶을 수 없어 제안하지 않는다.
 */
export function suggestSeasonPeriodForCrop(
  crop: { plantingPeriod: SuggestableCropPeriod; harvestPeriod: SuggestableCropPeriod },
  today: Date,
): SeasonPeriodSuggestion | null {
  const periods = [crop.plantingPeriod, crop.harvestPeriod];
  if (periods.some((period) => period.startMonth > period.endMonth)) return null;

  const startMonth = Math.min(...periods.map((period) => period.startMonth));
  const endMonth = Math.max(...periods.map((period) => period.endMonth));
  const currentYear = today.getFullYear();
  const year = startMonth >= today.getMonth() + 1 ? currentYear : currentYear + 1;

  return {
    startDate: `${year}-${pad2(startMonth)}-01`,
    endDate: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDateOnly(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}

function validateDateRange(
  startTimestamp: number,
  endTimestamp: number,
  errors: GrowingSeasonErrors,
) {
  if (endTimestamp < startTimestamp) {
    errors.endDate = "종료일은 시작일과 같거나 이후여야 합니다.";
    return;
  }

  const durationDays = (endTimestamp - startTimestamp) / DAY_IN_MILLISECONDS;
  if (durationDays > MAX_SEASON_DURATION_DAYS) {
    errors.endDate = "한 번의 재배은 730일 이내로 설정해 주세요.";
  }
}

function hasOverlappingSeason(
  spaceId: string,
  startTimestamp: number,
  endTimestamp: number,
  existingSeasons: readonly GrowingSeason[],
  editingSeasonId?: string,
) {
  return existingSeasons.some((season) => {
    if (season.id === editingSeasonId || season.spaceId !== spaceId) {
      return false;
    }

    const existingStart = parseDateOnly(season.startDate);
    const existingEnd = parseDateOnly(season.endDate);
    if (existingStart === null || existingEnd === null) return false;

    return startTimestamp <= existingEnd && endTimestamp >= existingStart;
  });
}
