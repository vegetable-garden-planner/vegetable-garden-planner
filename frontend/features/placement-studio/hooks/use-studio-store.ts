"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import {
  fetchContainerPlacements,
  putContainerPlacements,
} from "@/features/container-placement/infrastructure/container-placement-api";
import { useAllContainerPlacements } from "@/features/container-placement/hooks/use-all-container-placements";
import type { GardenLayout } from "@/features/garden-layout/domain/garden-layout";
import { putGardenLayout } from "@/features/garden-layout/infrastructure/garden-layout-api";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import type { PersistedGrowingSeason } from "@/features/growing-season/domain/growing-season";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { invalidateResource } from "@/shared/infrastructure/resource-cache";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type EditHistory,
} from "@/features/placement-studio/domain/edit-history";
import {
  fromLayout,
  toContainerInputs,
  toLayoutPlacements,
  toStudioPlacements,
  toStudioPlanter,
  type PlanRef,
} from "@/features/placement-studio/domain/studio-adapter";
import {
  planterKey,
  type StudioPlacement,
  type StudioPlanter,
  type StudioState,
} from "@/features/placement-studio/domain/studio-model";
import {
  packedSpots,
  readStudioView,
  writeExtraSpaces,
  writeStudioView,
} from "@/features/placement-studio/domain/studio-view-store";

/** Swagger 의 ContainerPlacementsInput.placements maxItems (계획 하나 기준) */
export const MAX_CONTAINER_PLACEMENTS = 200;

export type SaveState = "idle" | "saving" | "saved" | "error";

/** 편집 중에만 쓰는 임시 식별자. 서버에는 보내지 않는다. */
let sequence = 0;
export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export interface StudioPlan {
  id: string;
  name: string;
  mode: "container" | "garden";
  /** 이 계획의 화분 수 */
  planterCount: number;
}

export interface StudioContext {
  /** 사용자의 모든 재배 계획 */
  plans: readonly StudioPlan[];
  /** 캔버스에 올라간 (계획, 공간) 짝 */
  spaces: readonly GrowingSpace[];
  /** 사용자가 가진 화분 전체 */
  allSpaces: readonly GrowingSpace[];
  seasons: readonly PersistedGrowingSeason[];
  crops: readonly CropReference[];
  cropsById: ReadonlyMap<string, CropReference>;
  /** 칸이 모자라 옮겨 놓지 못한 실제 저장 수량 */
  unplaced: { cropId: string; count: number }[];
}

export type StudioLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; context: StudioContext; initial: StudioState };

/**
 * 통합 배치 캔버스
 *
 * 배치 편집기의 최상위 단위는 재배 계획 하나가 아니라 사용자의 재배 공간 전체다.
 * 서로 다른 계획의 화분도 한 캔버스에 함께 놓이고, 각 화분은 자기 계획을 그대로 달고 있다.
 * 계획을 합치는 것이 아니다 — 저장할 때는 계획별로 따로 나가고, 작물은 계획을 넘지 않는다.
 */
export function useStudioStore() {
  const seasons = useGrowingSeasons();
  const spaces = useGrowingSpaces();
  const catalog = useCropCatalog();
  const layouts = useGardenLayouts();
  const containers = useAllContainerPlacements();

  /** 아직 작물이 없어 서버가 그 계획의 화분으로 알 수 없는 (계획, 공간) 짝 */
  const [extraKeys, setExtraKeys] = useState<string[]>(() => readStudioView().extraSpaceIds);

  const load = useMemo(
    () => resolveLoad(seasons, spaces, catalog, layouts, containers, extraKeys),
    [seasons, spaces, catalog, layouts, containers, extraKeys],
  );

  const [history, setHistory] = useState<EditHistory<StudioState> | null>(null);
  const [baseline, setBaseline] = useState<StudioPlacement[] | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stamp, setStamp] = useState("");

  const ready = load.status === "ready" ? load : null;
  const nextStamp = ready ? ready.initial.planters.map((p) => `${p.id}:${p.version}`).join("|") : "";

  if (ready && nextStamp !== stamp) {
    setStamp(nextStamp);
    setHistory((current) => (
      current
        ? { ...current, present: mergeServerPlanters(current.present, ready.initial) }
        : createHistory(ready.initial)
    ));
    if (baseline === null) setBaseline(ready.initial.placements);
  }

  const state = history?.present ?? EMPTY_STATE;

  useEffect(() => {
    if (!history) return;
    writeStudioView(history.present.planters, history.present.groups);
  }, [history]);

  useEffect(() => { writeExtraSpaces(extraKeys); }, [extraKeys]);

  /** 이미 등록해 둔 화분을 어떤 계획의 화분으로 캔버스에 올린다. */
  const attachSpace = useCallback((seasonId: string, spaceId: string) => {
    const key = planterKey(seasonId, spaceId);
    setExtraKeys((current) => (current.includes(key) ? current : [...current, key]));
  }, []);

  const detachSpace = useCallback((planterId: string) => {
    setExtraKeys((current) => current.filter((key) => key !== planterId));
  }, []);

  const mutate = useCallback((recipe: (draft: StudioState) => void) => {
    setHistory((current) => {
      if (!current) return current;
      const draft = structuredClone(current.present) as StudioState;
      recipe(draft);
      return pushHistory(current, draft);
    });
    setSaveState("idle");
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => (current ? undoHistory(current) : current));
    setSaveState("idle");
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => (current ? redoHistory(current) : current));
    setSaveState("idle");
  }, []);

  /**
   * 저장
   *
   * 계획마다 배치 API 가 따로 있고 버전도 따로다.
   * 그래서 바뀐 계획만 골라, 계획별로 최신 버전을 읽어 그 계획 몫만 보낸다.
   */
  const save = useCallback(async () => {
    if (!ready || !history) return;
    setSaveState("saving");
    setSaveError(null);

    const present = history.present;
    const changed = changedSeasons(baseline ?? [], present.placements, present.planters);

    try {
      for (const seasonId of changed) {
        const plan = ready.context.plans.find((item) => item.id === seasonId);
        if (plan?.mode === "garden") {
          await saveLayout(present, seasonId, layouts);
        } else {
          const current = await fetchContainerPlacements(seasonId);
          await putContainerPlacements(
            seasonId,
            current.version,
            toContainerInputs(present, seasonId),
          );
          invalidateResource(`container-placements:${seasonId}`);
        }
      }

      invalidateResource("container-placements");
      invalidateResource("layouts");
      await containers.reload();
      await layouts.reload();

      setBaseline(present.placements);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "배치를 저장하지 못했습니다.");
    }
  }, [baseline, containers, history, layouts, ready]);

  const dirty = baseline !== null && !samePlacements(baseline, state.placements);

  return {
    load,
    state,
    dirty,
    saveState,
    saveError,
    canUndo: history ? canUndo(history) : false,
    canRedo: history ? canRedo(history) : false,
    mutate,
    undo,
    redo,
    save,
    reloadSpaces: spaces.reload,
    attachSpace,
    detachSpace,
  };
}

const EMPTY_STATE: StudioState = { planters: [], placements: [], groups: [] };

/** 어떤 계획의 배치가 바뀌었는지 (바뀐 계획만 저장한다) */
function changedSeasons(
  before: readonly StudioPlacement[],
  after: readonly StudioPlacement[],
  planters: readonly StudioPlanter[],
): string[] {
  const key = (item: StudioPlacement) => `${item.planterId}|${item.cropId}|${item.col}|${item.row}`;
  const group = (items: readonly StudioPlacement[]) => {
    const map = new Map<string, Set<string>>();
    for (const item of items) {
      if (!map.has(item.seasonId)) map.set(item.seasonId, new Set());
      map.get(item.seasonId)!.add(key(item));
    }
    return map;
  };

  const left = group(before);
  const right = group(after);
  const seasonIds = new Set([...left.keys(), ...right.keys(), ...planters.map((p) => p.seasonId)]);

  return [...seasonIds].filter((seasonId) => {
    const a = left.get(seasonId) ?? new Set<string>();
    const b = right.get(seasonId) ?? new Set<string>();
    if (a.size !== b.size) return true;
    for (const item of a) if (!b.has(item)) return true;
    return false;
  });
}

/** 서버 값을 다시 읽어도 편집 중이던 캔버스 좌표와 그룹은 유지한다. */
function mergeServerPlanters(current: StudioState, fresh: StudioState): StudioState {
  const spots = new Map(current.planters.map((p) => [p.id, { x: p.x, y: p.y }]));
  const planters = fresh.planters.map((planter) => {
    const spot = spots.get(planter.id);
    return spot ? { ...planter, ...spot } : planter;
  });
  const ids = new Set(planters.map((planter) => planter.id));

  return {
    planters,
    placements: current.placements.filter((item) => ids.has(item.planterId)),
    groups: current.groups.map((group) => ({
      ...group,
      planterIds: group.planterIds.filter((id) => ids.has(id)),
    })),
  };
}

/* ------------------------------------------------------------ 불러오기 */

function resolveLoad(
  seasons: ReturnType<typeof useGrowingSeasons>,
  spaces: ReturnType<typeof useGrowingSpaces>,
  catalog: ReturnType<typeof useCropCatalog>,
  layouts: ReturnType<typeof useGardenLayouts>,
  containers: ReturnType<typeof useAllContainerPlacements>,
  extraKeys: readonly string[],
): StudioLoad {
  const states = [seasons, spaces, catalog, layouts, containers];
  const failed = states.find((item) => item.status === "error");
  if (failed && failed.status === "error") return { status: "error", message: failed.message };
  if (states.some((item) => item.status === "loading")) return { status: "loading" };
  if (seasons.status !== "ready" || spaces.status !== "ready") return { status: "loading" };
  if (catalog.status !== "ready" || containers.status !== "ready") return { status: "loading" };
  if (layouts.status !== "ready") return { status: "loading" };

  const spaceById = new Map(spaces.spaces.map((space) => [space.id, space]));
  const view = readStudioView();
  const planters: StudioPlanter[] = [];
  const plans: StudioPlan[] = [];

  for (const season of seasons.seasons) {
    const main = spaceById.get(season.spaceId);
    const mode: "container" | "garden" = main?.type === "garden" ? "garden" : "container";
    const plan: PlanRef = { id: season.id, name: season.name, month: monthOf(season.startDate), mode };
    const spaceIds = spacesOfSeason(season.id, main, containers.placements, extraKeys, spaceById, mode);

    let count = 0;
    for (const spaceId of spaceIds) {
      const space = spaceById.get(spaceId);
      if (!space) continue;
      if (mode === "container" && space.type === "garden") continue;

      const planter = toStudioPlanter(space, plan, { x: 0, y: 0 });
      const layout = layouts.layouts.find((item) => item.seasonId === season.id);
      planters.push(
        mode === "garden" && layout && layout.spaceId === spaceId
          ? { ...planter, cols: layout.columns, rows: layout.rows }
          : planter,
      );
      count += 1;
    }

    if (count > 0) plans.push({ id: season.id, name: season.name, mode, planterCount: count });
  }

  if (planters.length === 0) return { status: "empty" };

  applySpots(planters, view.spots);

  const loaded = toStudioPlacements(containers.placements, planters);
  const placements = [...loaded.placements];
  for (const layout of layouts.layouts) {
    const planter = planters.find(
      (item) => item.seasonId === layout.seasonId && item.spaceId === layout.spaceId,
    );
    if (planter && planter.mode === "garden") placements.push(...fromLayout(layout, planter));
  }

  const planterIds = new Set(planters.map((planter) => planter.id));
  const groups = view.groups.map((group) => ({
    ...group,
    planterIds: group.planterIds.filter((id) => planterIds.has(id)),
  }));

  return {
    status: "ready",
    context: {
      plans,
      spaces: planters
        .map((planter) => spaceById.get(planter.spaceId))
        .filter((space): space is GrowingSpace => space !== undefined),
      allSpaces: spaces.spaces,
      seasons: seasons.seasons,
      crops: catalog.crops,
      cropsById: new Map(catalog.crops.map((crop) => [crop.id, crop])),
      unplaced: loaded.unplaced,
    },
    initial: { planters, placements, groups },
  };
}

/** 저장해 둔 자리가 있으면 그대로 쓰고, 없으면 겹치지 않게 늘어놓는다. */
function applySpots(
  planters: StudioPlanter[],
  spots: Record<string, { x: number; y: number }>,
): void {
  const packed = packedSpots(planters);
  for (const [index, planter] of planters.entries()) {
    const spot = spots[planter.id] ?? packed[index];
    planter.x = spot.x;
    planter.y = spot.y;
  }
}

/**
 * 한 재배 계획이 쓰는 공간
 *
 * 서버 기준: 계획의 대표 공간 + 그 계획의 배치가 저장된 공간.
 * 여기에 사용자가 캔버스에 올려 둔(아직 작물 없는) 공간을 더한다.
 * 다른 계획의 배치는 seasonId 로 걸러지므로 계획끼리 섞이지 않는다.
 */
function spacesOfSeason(
  seasonId: string,
  main: GrowingSpace | undefined,
  rows: readonly { seasonId: string; spaceId: string }[],
  extraKeys: readonly string[],
  spaceById: ReadonlyMap<string, GrowingSpace>,
  mode: "container" | "garden",
): Set<string> {
  const ids = new Set<string>();
  if (main) ids.add(main.id);
  if (mode !== "container") return ids;

  for (const row of rows) {
    if (row.seasonId === seasonId) ids.add(row.spaceId);
  }
  for (const key of extraKeys) {
    const [owner, spaceId] = key.split("::");
    if (owner === seasonId && spaceById.has(spaceId)) ids.add(spaceId);
  }

  return ids;
}

async function saveLayout(
  state: StudioState,
  seasonId: string,
  layouts: ReturnType<typeof useGardenLayouts>,
): Promise<void> {
  const planter = state.planters.find((item) => item.seasonId === seasonId);
  const layout: GardenLayout | undefined = layouts.status === "ready"
    ? layouts.layouts.find((item) => item.seasonId === seasonId)
    : undefined;
  if (!planter || !layout) {
    throw new Error("텃밭 격자를 찾지 못했어요. 텃밭 화면에서 격자를 먼저 만들어 주세요.");
  }

  await putGardenLayout({
    ...layout,
    placements: toLayoutPlacements(state, planter, layout.columns),
  });
}

function monthOf(date: string): number | null {
  const month = Number(date.slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function samePlacements(left: readonly StudioPlacement[], right: readonly StudioPlacement[]): boolean {
  if (left.length !== right.length) return false;
  const key = (item: StudioPlacement) => `${item.planterId}|${item.cropId}|${item.col}|${item.row}`;
  const seen = new Set(left.map(key));
  return right.every((item) => seen.has(key(item)));
}
