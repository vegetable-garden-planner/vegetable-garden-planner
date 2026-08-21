import type { CropId } from "../data/crop-selection.ts";

export type GardenConfiguration = {
  planter: {
    widthCm: number;
    heightCm: number;
    depthCm: number;
    count: number;
  };
  sunlight: {
    duration: "2h" | "3-5h" | "6h+";
    location: "balcony" | "window" | "indoor";
  };
  preferences: {
    selectedCrops: CropId[];
  };
};

export type GardenConfiguratorState = Omit<GardenConfiguration, "sunlight"> & {
  sunlight: Partial<GardenConfiguration["sunlight"]>;
};

export const DEFAULT_GARDEN_CONFIGURATOR_STATE: GardenConfiguratorState = {
  planter: {
    widthCm: 60,
    heightCm: 25,
    depthCm: 20,
    count: 2,
  },
  sunlight: {},
  preferences: {
    selectedCrops: ["lettuce", "basil"],
  },
};

export function toGardenConfiguration(
  state: GardenConfiguratorState,
): GardenConfiguration | null {
  if (!state.sunlight.duration || !state.sunlight.location) return null;

  return {
    planter: { ...state.planter },
    sunlight: {
      duration: state.sunlight.duration,
      location: state.sunlight.location,
    },
    preferences: {
      selectedCrops: [...state.preferences.selectedCrops],
    },
  };
}
