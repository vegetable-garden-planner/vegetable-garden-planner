/**
 * 화분 배치 결과 요약
 *
 * "배치 이유"나 "며칠 뒤 수확" 같은, 카탈로그에 뒷받침 데이터가 없는
 * 문구는 만들지 않는다. 여기 있는 숫자는 전부 실제 배치·공간·작물
 * 데이터에서 계산한다.
 */

export type SunlightLevel = "low" | "partial" | "full";

const SUNLIGHT_RANK: Record<SunlightLevel, number> = { low: 0, partial: 1, full: 2 };

export interface SummaryCrop {
  id: string;
  name: string;
  plantSpacingCm: number;
  minPotDepthCm: number | null;
  sunRequirement: SunlightLevel | null;
}

export interface SummarySpace {
  id: string;
  name: string;
  type: string;
  widthCm: number;
  lengthCm: number;
  depthCm: number | null;
  sunlight: SunlightLevel | null;
}

export interface SummaryPlacement {
  spaceId: string;
  cropId: string;
  quantity: number;
}

/** unknown = 판단할 기준값(화분 깊이·햇빛)이 없어서 맞는지 알 수 없다 */
export type FitLevel = "sufficient" | "insufficient" | "unknown";

export interface SummaryItem {
  cropId: string;
  cropName: string;
  quantity: number;
  plantSpacingCm: number;
}

export interface ContainerSummary {
  space: SummarySpace;
  items: SummaryItem[];
  /** 화분 부피(가로×세로×깊이) 기반. 깊이를 모르면 null */
  soilLiters: number | null;
  sunlightFit: FitLevel;
  depthFit: FitLevel;
}

export interface PlacementSummary {
  containers: ContainerSummary[];
  containerCount: number;
  cropTypeCount: number;
  totalQuantity: number;
  totalSoilLiters: number;
}

export function buildPlacementSummary(
  placements: readonly SummaryPlacement[],
  spaces: readonly SummarySpace[],
  crops: readonly SummaryCrop[],
): PlacementSummary {
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));

  const containers = spaces
    .map((space) => {
      const spacePlacements = placements.filter((placement) => placement.spaceId === space.id);
      if (spacePlacements.length === 0) return null;
      return buildContainerSummary(space, spacePlacements, cropById);
    })
    .filter((container): container is ContainerSummary => container !== null);

  return {
    containers,
    containerCount: containers.length,
    cropTypeCount: new Set(placements.map((placement) => placement.cropId)).size,
    totalQuantity: placements.reduce((sum, placement) => sum + placement.quantity, 0),
    totalSoilLiters: containers.reduce((sum, container) => sum + (container.soilLiters ?? 0), 0),
  };
}

function buildContainerSummary(
  space: SummarySpace,
  spacePlacements: readonly SummaryPlacement[],
  cropById: ReadonlyMap<string, SummaryCrop>,
): ContainerSummary {
  const items: SummaryItem[] = spacePlacements.map((placement) => {
    const crop = cropById.get(placement.cropId);
    return {
      cropId: placement.cropId,
      cropName: crop?.name ?? "알 수 없는 작물",
      quantity: placement.quantity,
      plantSpacingCm: crop?.plantSpacingCm ?? 0,
    };
  });

  return {
    space,
    items,
    soilLiters: calculateSoilLiters(space),
    sunlightFit: calculateSunlightFit(spacePlacements, space, cropById),
    depthFit: calculateDepthFit(spacePlacements, space, cropById),
  };
}

function calculateSoilLiters(space: SummarySpace): number | null {
  if (space.depthCm === null) return null;
  return (space.widthCm * space.lengthCm * space.depthCm) / 1000;
}

function calculateSunlightFit(
  spacePlacements: readonly SummaryPlacement[],
  space: SummarySpace,
  cropById: ReadonlyMap<string, SummaryCrop>,
): FitLevel {
  if (space.sunlight === null) return "unknown";
  const spaceRank = SUNLIGHT_RANK[space.sunlight];

  for (const placement of spacePlacements) {
    const crop = cropById.get(placement.cropId);
    if (crop?.sunRequirement && SUNLIGHT_RANK[crop.sunRequirement] > spaceRank) {
      return "insufficient";
    }
  }
  return "sufficient";
}

function calculateDepthFit(
  spacePlacements: readonly SummaryPlacement[],
  space: SummarySpace,
  cropById: ReadonlyMap<string, SummaryCrop>,
): FitLevel {
  if (space.depthCm === null) return "unknown";

  for (const placement of spacePlacements) {
    const crop = cropById.get(placement.cropId);
    if (crop?.minPotDepthCm && crop.minPotDepthCm > space.depthCm) {
      return "insufficient";
    }
  }
  return "sufficient";
}
