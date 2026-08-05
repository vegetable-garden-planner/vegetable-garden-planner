export interface GrowingSeasonFormValues {
  spaceId: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export type GrowingSeasonInput = GrowingSeasonFormValues;

export interface GrowingSeason extends GrowingSeasonInput {
  id: string;
  createdAt: string;
}

export type GrowingSeasonField = keyof GrowingSeasonFormValues;
export type GrowingSeasonErrors = Partial<Record<GrowingSeasonField, string>>;

export type GrowingSeasonValidation =
  | { valid: true; value: GrowingSeasonInput }
  | { valid: false; errors: GrowingSeasonErrors };

const MAX_SEASON_DURATION_DAYS = 730;
const DAY_IN_MILLISECONDS = 86_400_000;

export function validateGrowingSeason(
  values: GrowingSeasonFormValues,
  registeredSpaceIds: readonly string[],
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
    errors.name = "시즌 이름은 2자 이상 30자 이하로 입력해 주세요.";
  }
  if (startTimestamp === null) {
    errors.startDate = "올바른 시작일을 입력해 주세요.";
  }
  if (endTimestamp === null) {
    errors.endDate = "올바른 종료일을 입력해 주세요.";
  }

  if (startTimestamp !== null && endTimestamp !== null) {
    validateDateRange(startTimestamp, endTimestamp, errors);
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

export function createGrowingSeason(
  input: GrowingSeasonInput,
  id: string,
  createdAt: string,
): GrowingSeason {
  return { ...input, id, createdAt };
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
    errors.endDate = "한 시즌은 730일 이내로 설정해 주세요.";
  }
}
