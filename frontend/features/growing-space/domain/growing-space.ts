import type {
  GrowingSpaceType,
  SunlightExposure,
} from "@/shared/domain/growing-environment";
import type { SpaceOrientation } from "@/features/growing-space/domain/sunlight-estimate";

export interface GrowingSpaceFormValues {
  name: string;
  type: GrowingSpaceType;
  sunlight: SunlightExposure;
  widthCm: string;
  lengthCm: string;
  depthCm: string;
  address: string;
  latitude: string;
  longitude: string;
  orientation: SpaceOrientation | null;
  estimatedSunlightHours: number | null;
  notes: string;
}

export interface GrowingSpaceInput {
  name: string;
  type: GrowingSpaceType;
  sunlight: SunlightExposure;
  widthCm: number;
  lengthCm: number;
  depthCm: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  orientation: SpaceOrientation | null;
  estimatedSunlightHours: number | null;
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
const MIN_DEPTH_CM = 1;
const MAX_DEPTH_CM = 1000;

export function validateGrowingSpace(
  values: GrowingSpaceFormValues,
): GrowingSpaceValidation {
  const errors: GrowingSpaceErrors = {};
  const name = values.name.trim();
  const widthCm = Number(values.widthCm);
  const lengthCm = Number(values.lengthCm);
  const depthCm = values.depthCm === "" ? null : Number(values.depthCm);
  const latitude = values.latitude === "" ? null : Number(values.latitude);
  const longitude = values.longitude === "" ? null : Number(values.longitude);

  if (!name) {
    errors.name = "공간 이름을 입력해 주세요.";
  } else if (name.length > 30) {
    errors.name = "공간 이름은 30자 이하로 입력해 주세요.";
  }

  validateSize("widthCm", widthCm, errors);
  validateSize("lengthCm", lengthCm, errors);

  if (depthCm !== null && (!Number.isFinite(depthCm) || depthCm < MIN_DEPTH_CM || depthCm > MAX_DEPTH_CM)) {
    errors.depthCm = `${MIN_DEPTH_CM}cm 이상 ${MAX_DEPTH_CM}cm 이하로 입력해 주세요.`;
  }

  if ((latitude === null) !== (longitude === null)) {
    errors.latitude = "위도와 경도를 함께 입력해 주세요.";
  } else if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    errors.latitude = "올바른 위도를 입력해 주세요.";
  } else if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    errors.longitude = "올바른 경도를 입력해 주세요.";
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
      depthCm,
      address: values.address.trim() || null,
      latitude,
      longitude,
      orientation: values.orientation,
      estimatedSunlightHours: values.estimatedSunlightHours,
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
