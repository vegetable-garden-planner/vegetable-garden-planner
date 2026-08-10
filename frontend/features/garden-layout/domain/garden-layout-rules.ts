import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { CropPlacement, GardenLayout } from "./garden-layout.ts";

export type GardenLayoutRuleType =
  | "spacing"
  | "planting-period"
  | "crop-rotation";

export interface GardenLayoutRuleTarget {
  seasonId: string;
  cellIndex: number;
  cropId: string;
}

export interface GardenLayoutRuleWarning {
  type: GardenLayoutRuleType;
  message: string;
  targets: readonly GardenLayoutRuleTarget[];
}

export class InvalidGardenLayoutRuleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGardenLayoutRuleDataError";
  }
}

interface ResolvedPlacement {
  placement: CropPlacement;
  crop: CropReference;
}

export function getGardenLayoutRuleWarnings(
  layout: GardenLayout,
  season: GrowingSeason,
  crops: readonly CropReference[],
  layouts: readonly GardenLayout[],
  seasons: readonly GrowingSeason[],
): GardenLayoutRuleWarning[] {
  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  const currentPlacements = resolvePlacements(layout, cropsById);

  return [
    ...getPlantingPeriodWarnings(layout, season, currentPlacements),
    ...getSpacingWarnings(layout, currentPlacements),
    ...getCropRotationWarnings(
      layout,
      season,
      currentPlacements,
      layouts,
      seasons,
      cropsById,
    ),
  ];
}

function getPlantingPeriodWarnings(
  layout: GardenLayout,
  season: GrowingSeason,
  placements: readonly ResolvedPlacement[],
): GardenLayoutRuleWarning[] {
  const placementsByCropId = new Map<string, ResolvedPlacement[]>();
  for (const resolved of placements) {
    const current = placementsByCropId.get(resolved.crop.id) ?? [];
    current.push(resolved);
    placementsByCropId.set(resolved.crop.id, current);
  }

  const warnings: GardenLayoutRuleWarning[] = [];
  for (const cropPlacements of placementsByCropId.values()) {
    const crop = cropPlacements[0]?.crop;
    if (!crop || seasonOverlapsCropPeriod(season, crop)) continue;

    warnings.push({
      type: "planting-period",
      message: `${crop.name}의 권장 심는 시기(${crop.plantingPeriod.label})가 ${season.name} 기간과 겹치지 않습니다.`,
      targets: cropPlacements.map(({ placement }) => ({
        seasonId: layout.seasonId,
        cellIndex: placement.cellIndex,
        cropId: placement.cropId,
      })),
    });
  }
  return warnings;
}

function getSpacingWarnings(
  layout: GardenLayout,
  placements: readonly ResolvedPlacement[],
): GardenLayoutRuleWarning[] {
  const warnings: GardenLayoutRuleWarning[] = [];

  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const left = placements[leftIndex];
      const right = placements[rightIndex];
      if (!left || !right) continue;

      const distanceCm = getCellCenterDistanceCm(
        layout,
        left.placement.cellIndex,
        right.placement.cellIndex,
      );
      const requiredCm = Math.max(
        left.crop.plantSpacingCm,
        right.crop.plantSpacingCm,
      );
      if (distanceCm >= requiredCm) continue;

      const cropLabel = left.crop.id === right.crop.id
        ? `${left.crop.name}끼리`
        : `${left.crop.name}와 ${right.crop.name}`;
      warnings.push({
        type: "spacing",
        message: `${cropLabel} ${formatDistance(distanceCm)}cm 떨어져 있습니다. 최소 ${requiredCm}cm 간격이 필요합니다.`,
        targets: [left, right].map(({ placement }) => ({
          seasonId: layout.seasonId,
          cellIndex: placement.cellIndex,
          cropId: placement.cropId,
        })),
      });
    }
  }
  return warnings;
}

function getCropRotationWarnings(
  layout: GardenLayout,
  season: GrowingSeason,
  currentPlacements: readonly ResolvedPlacement[],
  layouts: readonly GardenLayout[],
  seasons: readonly GrowingSeason[],
  cropsById: ReadonlyMap<string, CropReference>,
): GardenLayoutRuleWarning[] {
  const previous = findPreviousCultivatedSeason(layout, season, layouts, seasons);
  if (!previous) return [];

  const previousPlacements = resolvePlacements(previous.layout, cropsById);
  const warnings: GardenLayoutRuleWarning[] = [];

  for (const current of currentPlacements) {
    const previousMatch = previousPlacements.find((candidate) =>
      candidate.crop.familyName === current.crop.familyName
      && cellsOverlap(
        layout,
        current.placement.cellIndex,
        previous.layout,
        candidate.placement.cellIndex,
      ));
    if (!previousMatch) continue;

    warnings.push({
      type: "crop-rotation",
      message: `${previous.season.name}의 ${previousMatch.crop.name}와 같은 ${current.crop.familyName} 작물인 ${current.crop.name}이 같은 구역에 배치되었습니다. 연작 피해 가능성을 확인해 주세요.`,
      targets: [
        {
          seasonId: layout.seasonId,
          cellIndex: current.placement.cellIndex,
          cropId: current.placement.cropId,
        },
        {
          seasonId: previous.layout.seasonId,
          cellIndex: previousMatch.placement.cellIndex,
          cropId: previousMatch.placement.cropId,
        },
      ],
    });
  }
  return warnings;
}

function resolvePlacements(
  layout: GardenLayout,
  cropsById: ReadonlyMap<string, CropReference>,
): ResolvedPlacement[] {
  return layout.placements.map((placement) => {
    const crop = cropsById.get(placement.cropId);
    if (!crop) {
      throw new InvalidGardenLayoutRuleDataError(
        `배치된 작물 기준 정보를 찾을 수 없습니다: ${placement.cropId}`,
      );
    }
    return { placement, crop };
  });
}

function seasonOverlapsCropPeriod(
  season: Pick<GrowingSeason, "startDate" | "endDate">,
  crop: CropReference,
) {
  if (
    !isDateOnly(season.startDate)
    || !isDateOnly(season.endDate)
    || season.startDate > season.endDate
  ) {
    throw new InvalidGardenLayoutRuleDataError(
      "재배 시기를 검사할 시즌 기간이 올바르지 않습니다.",
    );
  }

  const startYear = Number(season.startDate.slice(0, 4));
  const endYear = Number(season.endDate.slice(0, 4));
  const spansYearBoundary = crop.plantingPeriod.endMonth
    < crop.plantingPeriod.startMonth;
  const firstPeriodYear = spansYearBoundary ? startYear - 1 : startYear;

  for (let year = firstPeriodYear; year <= endYear; year += 1) {
    const periodStart = toDateOnly(year, crop.plantingPeriod.startMonth, 1);
    const periodEnd = toDateOnly(
      spansYearBoundary ? year + 1 : year,
      crop.plantingPeriod.endMonth,
      getLastDayOfMonth(
        spansYearBoundary ? year + 1 : year,
        crop.plantingPeriod.endMonth,
      ),
    );
    if (season.startDate <= periodEnd && season.endDate >= periodStart) {
      return true;
    }
  }
  return false;
}

function findPreviousCultivatedSeason(
  currentLayout: GardenLayout,
  currentSeason: GrowingSeason,
  layouts: readonly GardenLayout[],
  seasons: readonly GrowingSeason[],
) {
  const layoutsBySeasonId = new Map(
    layouts
      .filter((layout) => layout.spaceId === currentLayout.spaceId)
      .map((layout) => [layout.seasonId, layout]),
  );

  for (const candidate of [...seasons].sort((left, right) =>
    right.endDate.localeCompare(left.endDate))) {
    if (
      candidate.id === currentSeason.id
      || candidate.spaceId !== currentSeason.spaceId
      || candidate.endDate >= currentSeason.startDate
    ) {
      continue;
    }

    const candidateLayout = layoutsBySeasonId.get(candidate.id);
    if (candidateLayout) return { season: candidate, layout: candidateLayout };
  }
  return null;
}

function getCellCenterDistanceCm(
  layout: GardenLayout,
  leftCellIndex: number,
  rightCellIndex: number,
) {
  const leftRow = Math.floor(leftCellIndex / layout.columns);
  const leftColumn = leftCellIndex % layout.columns;
  const rightRow = Math.floor(rightCellIndex / layout.columns);
  const rightColumn = rightCellIndex % layout.columns;
  return Math.hypot(
    (leftColumn - rightColumn) * layout.cellSizeCm,
    (leftRow - rightRow) * layout.cellSizeCm,
  );
}

function cellsOverlap(
  leftLayout: GardenLayout,
  leftCellIndex: number,
  rightLayout: GardenLayout,
  rightCellIndex: number,
) {
  const left = getCellBounds(leftLayout, leftCellIndex);
  const right = getCellBounds(rightLayout, rightCellIndex);
  return Math.max(left.x, right.x) < Math.min(left.right, right.right)
    && Math.max(left.y, right.y) < Math.min(left.bottom, right.bottom);
}

function getCellBounds(layout: GardenLayout, cellIndex: number) {
  const row = Math.floor(cellIndex / layout.columns);
  const column = cellIndex % layout.columns;
  const x = column * layout.cellSizeCm;
  const y = row * layout.cellSizeCm;
  return {
    x,
    y,
    right: x + layout.cellSizeCm,
    bottom: y + layout.cellSizeCm,
  };
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function toDateOnly(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDistance(distanceCm: number) {
  return Number.isInteger(distanceCm) ? distanceCm : Math.round(distanceCm * 10) / 10;
}
