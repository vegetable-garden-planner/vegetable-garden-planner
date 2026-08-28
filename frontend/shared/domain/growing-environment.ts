export type GrowingSpaceType = "indoor" | "balcony" | "garden";
export type SunlightExposure = "low" | "partial" | "full";
export type SpaceShade = "none" | "some" | "heavy";

export function isGrowingSpaceType(value: string): value is GrowingSpaceType {
  return value === "indoor" || value === "balcony" || value === "garden";
}

export function isSunlightExposure(value: string): value is SunlightExposure {
  return value === "low" || value === "partial" || value === "full";
}

export function isSpaceShade(value: string): value is SpaceShade {
  return value === "none" || value === "some" || value === "heavy";
}
