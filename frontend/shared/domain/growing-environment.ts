export type GrowingSpaceType = "indoor" | "balcony" | "garden";
export type SunlightExposure = "low" | "partial" | "full";

export function isGrowingSpaceType(value: string): value is GrowingSpaceType {
  return value === "indoor" || value === "balcony" || value === "garden";
}

export function isSunlightExposure(value: string): value is SunlightExposure {
  return value === "low" || value === "partial" || value === "full";
}
