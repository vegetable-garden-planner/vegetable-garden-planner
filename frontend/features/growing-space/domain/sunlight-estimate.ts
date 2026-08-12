import type { SunlightExposure } from "@/shared/domain/growing-environment";

export type SpaceOrientation =
  | "open"
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest";

const ORIENTATION_FACTORS: Record<SpaceOrientation, number> = {
  open: 0.72,
  north: 0.14,
  northeast: 0.28,
  east: 0.4,
  southeast: 0.52,
  south: 0.58,
  southwest: 0.52,
  west: 0.4,
  northwest: 0.28,
};

export interface SunlightEstimate {
  exposure: SunlightExposure;
  hours: number;
}

export function estimateSunlight(
  latitude: number,
  orientation: SpaceOrientation,
  date = new Date(),
): SunlightEstimate {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("위도는 -90도 이상 90도 이하여야 합니다.");
  }

  const dayOfYear = getDayOfYear(date);
  const latitudeRadians = toRadians(latitude);
  const declination = toRadians(23.44 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81))));
  const cosine = clamp(-Math.tan(latitudeRadians) * Math.tan(declination), -1, 1);
  const daylightHours = (24 / Math.PI) * Math.acos(cosine);
  const hours = Math.round(Math.min(12, daylightHours * ORIENTATION_FACTORS[orientation]) * 10) / 10;

  return {
    hours,
    exposure: hours >= 6 ? "full" : hours >= 2 ? "partial" : "low",
  };
}

function getDayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86_400_000);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
