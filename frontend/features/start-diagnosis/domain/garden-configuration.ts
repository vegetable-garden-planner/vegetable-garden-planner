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

// diagnosis-form.tsx가 진행 상태를 저장하는 키와 동일하다. 로그인/회원가입을
// 거쳐 /spaces/new로 돌아왔을 때 방금 진단한 화분 크기·햇빛 조건을 그대로
// 이어받기 위해 다른 기능(growing-space)에서도 이 키로 값을 읽는다.
export const GARDEN_CONFIGURATOR_STORAGE_KEY = "simeobom:garden-configurator:v1";

export function readStoredGardenConfiguration(): GardenConfiguration | null {
  try {
    const raw = window.sessionStorage.getItem(GARDEN_CONFIGURATOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { configuration?: GardenConfiguratorState };
    if (!parsed.configuration) return null;
    return toGardenConfiguration(parsed.configuration);
  } catch {
    return null;
  }
}

export function clearStoredGardenConfiguration(): void {
  try {
    window.sessionStorage.removeItem(GARDEN_CONFIGURATOR_STORAGE_KEY);
  } catch {
    // sessionStorage가 막혀 있어도 진단 흐름 자체는 계속 동작해야 한다.
  }
}
