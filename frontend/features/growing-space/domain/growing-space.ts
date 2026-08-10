import type {
  GrowingSpaceType,
  SunlightExposure,
} from "@/shared/domain/growing-environment";

export interface GrowingSpaceFormValues {
  name: string;
  type: GrowingSpaceType;
  sunlight: SunlightExposure;
  widthCm: string;
  lengthCm: string;
  region: string;
  notes: string;
}

export interface GrowingSpaceInput {
  name: string;
  type: GrowingSpaceType;
  sunlight: SunlightExposure;
  widthCm: number;
  lengthCm: number;
  region: string;
  notes: string;
}

export interface GrowingSpace extends GrowingSpaceInput {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type GrowingSpaceField = keyof GrowingSpaceFormValues;
export type GrowingSpaceErrors = Partial<Record<GrowingSpaceField, string>>;

export type GrowingSpaceValidation =
  | { valid: true; value: GrowingSpaceInput }
  | { valid: false; errors: GrowingSpaceErrors };

const MIN_SIZE_CM = 10;
const MAX_SIZE_CM = 100_000;

export function validateGrowingSpace(
  values: GrowingSpaceFormValues,
): GrowingSpaceValidation {
  const errors: GrowingSpaceErrors = {};
  const name = values.name.trim();
  const region = values.region.trim();
  const widthCm = Number(values.widthCm);
  const lengthCm = Number(values.lengthCm);

  if (!name) {
    errors.name = "공간 이름을 입력해 주세요.";
  } else if (name.length > 30) {
    errors.name = "공간 이름은 30자 이하로 입력해 주세요.";
  }

  validateSize("widthCm", widthCm, errors);
  validateSize("lengthCm", lengthCm, errors);

  if (!region) {
    errors.region = "재배 지역을 선택해 주세요.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      name,
      type: values.type,
      sunlight: values.sunlight,
      widthCm,
      lengthCm,
      region,
      notes: values.notes.trim(),
    },
  };
}

export function createGrowingSpace(
  input: GrowingSpaceInput,
  id: string,
  createdAt: string,
): GrowingSpace {
  return { ...input, id, version: 1, createdAt, updatedAt: createdAt };
}

function validateSize(
  field: "widthCm" | "lengthCm",
  value: number,
  errors: GrowingSpaceErrors,
) {
  if (!Number.isFinite(value)) {
    errors[field] = "숫자로 입력해 주세요.";
    return;
  }

  if (value < MIN_SIZE_CM || value > MAX_SIZE_CM) {
    errors[field] = `${MIN_SIZE_CM}cm 이상 ${MAX_SIZE_CM}cm 이하로 입력해 주세요.`;
  }
}
