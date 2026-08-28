"use client";

import { useCallback } from "react";
import type { GrowingSpace, GrowingSpaceInput } from "@/features/growing-space/domain/growing-space";
import {
  createGrowingSpace,
  deleteGrowingSpace,
  updateGrowingSpace,
} from "@/features/growing-space/infrastructure/space-api";
import {
  firstFreeCell,
  findPlacement,
  findPlanter,
  gridColumns,
  gridRows,
  isCellTaken,
  placementsOf,
  type StudioState,
} from "@/features/placement-studio/domain/studio-model";
import {
  syncMembershipFromFrame,
  syncMembershipFromPlanter,
} from "@/features/placement-studio/domain/planter-group";
import { useGroupActions } from "./use-group-actions";
import { arrangeSpots } from "@/features/placement-studio/domain/studio-view-store";
import { MAX_CONTAINER_PLACEMENTS, nextId, type StudioContext } from "./use-studio-store";

type Mutate = (recipe: (draft: StudioState) => void) => void;

export type PlaceResult = { ok: true; id: string } | { ok: false; message: string };

export interface PlanterForm {
  name: string;
  widthCm: number;
  lengthCm: number;
  depthCm: number | null;
  address: string;
  sunlight: GrowingSpace["sunlight"];
  type: GrowingSpace["type"];
}

/**
 * 편집기에서 일어나는 모든 변경
 *
 * 작물 배치·화분 좌표·그룹은 편집 상태에만 반영되고 저장 버튼을 눌러야 서버로 간다.
 * 화분 자체(이름·크기·깊이·위치·햇빛)는 실제 /spaces API 라서 바로 서버에 반영된다.
 */
export interface PlanMembership {
  /** 이미 등록해 둔 화분을 그 계획의 화분으로 캔버스에 올린다. */
  attachSpace: (spaceId: string, seasonId: string) => void;
  /** 캔버스에서 내린다. 화분 자체는 지우지 않는다. */
  detachSpace: (spaceId: string) => void;
}

export function useStudioActions(
  state: StudioState,
  mutate: Mutate,
  context: StudioContext | null,
  notify: (message: string) => void,
  reloadSpaces: () => Promise<void>,
  membership: PlanMembership,
) {
  /** 놓은 작물의 임시 id 를 돌려준다. 바로 선택해 정보 창에 띄우기 위해서다. */
  const placeCrop = useCallback((
    cropId: string,
    planterId: string,
    col: number,
    row: number,
  ): PlaceResult => {
    if (isCellTaken(state, planterId, col, row)) {
      return { ok: false, message: "이 칸에는 이미 작물이 있습니다." };
    }
    if (state.placements.length >= MAX_CONTAINER_PLACEMENTS) {
      return { ok: false, message: `한 계획에는 작물을 ${MAX_CONTAINER_PLACEMENTS}포기까지 배치할 수 있어요.` };
    }
    const id = nextId("new");
    mutate((draft) => {
      const planter = draft.planters.find((item) => item.id === planterId);
      if (!planter) return;
      draft.placements.push({
        id, cropId, planterId, seasonId: planter.seasonId, col, row, plantedAt: today(),
      });
    });
    return { ok: true, id };
  }, [mutate, state]);

  const moveCrop = useCallback((id: string, planterId: string, col: number, row: number): string | null => {
    if (isCellTaken(state, planterId, col, row, id)) return "이 칸에는 이미 작물이 있습니다.";

    // 배치는 계획마다 따로 저장되고, 계획 사이로 옮기는 API 가 없다.
    // 억지로 옮기면 한쪽에서 지우고 다른 쪽에 넣는 두 번의 저장이 되어 중간에 실패하면 작물이 사라진다.
    const source = findPlacement(state, id);
    const target = findPlanter(state, planterId);
    if (source && target && source.seasonId !== target.seasonId) {
      return "다른 재배 계획의 화분으로는 옮길 수 없어요. 같은 계획 안에서 옮겨 주세요.";
    }
    mutate((draft) => {
      const placement = draft.placements.find((item) => item.id === id);
      if (!placement) return;
      placement.planterId = planterId;
      placement.col = col;
      placement.row = row;
    });
    return null;
  }, [mutate, state]);

  const deleteCrops = useCallback((ids: readonly string[]) => {
    mutate((draft) => {
      draft.placements = draft.placements.filter((item) => !ids.includes(item.id));
    });
  }, [mutate]);

  const duplicateCrop = useCallback((id: string): string | null => {
    const source = findPlacement(state, id);
    const planter = source ? findPlanter(state, source.planterId) : undefined;
    if (!source || !planter) return null;

    const free = firstFreeCell(state, planter);
    if (!free) return "빈 칸이 없습니다.";

    const newId = nextId("new");
    mutate((draft) => {
      draft.placements.push({ ...source, id: newId, col: free.col, row: free.row, plantedAt: today() });
    });
    return newId;
  }, [mutate, state]);

  /** 선택한 작물을 빈 칸에 다시 흩어 놓는다. */
  const autoSpace = useCallback((ids: readonly string[]) => {
    mutate((draft) => {
      ids.forEach((id, index) => {
        const placement = draft.placements.find((item) => item.id === id);
        if (!placement) return;
        const planter = draft.planters.find((item) => item.id === placement.planterId);
        if (!planter) return;

        const used = new Set(draft.placements
          .filter((item) => !ids.includes(item.id) && item.planterId === planter.id)
          .map((item) => `${item.col},${item.row}`));

        const spots: [number, number][] = [];
        for (let row = 0; row < planter.rows; row += 1) {
          for (let col = 0; col < planter.cols; col += 1) spots.push([col, row]);
        }
        const free = spots.filter(([col, row]) => !used.has(`${col},${row}`));
        const spot = free[index] ?? spots[0];
        placement.col = spot[0];
        placement.row = spot[1];
      });
    });
  }, [mutate]);

  const movePlanter = useCallback((id: string, x: number, y: number) => {
    mutate((draft) => {
      const planter = draft.planters.find((item) => item.id === id);
      if (!planter) return;
      planter.x = x;
      planter.y = y;
      syncMembershipFromPlanter(draft, id);
    });
  }, [mutate]);

  const arrange = useCallback(() => {
    mutate((draft) => {
      draft.planters = arrangeSpots(draft.planters);
      for (const group of draft.groups) syncMembershipFromFrame(draft, group.id);
    });
  }, [mutate]);

  /* --------------------------------------------------- 화분 (실제 /spaces API) */

  const addPlanter = useCallback(async (form: PlanterForm, seasonId: string) => {
    const space = await createGrowingSpace(toSpaceInput(form, null));
    // 갓 만든 화분은 아직 작물이 없어 서버가 그 계획의 화분으로 알 수 없다. 캔버스에는 바로 올린다.
    membership.attachSpace(space.id, seasonId);
    await reloadSpaces();
  }, [membership, reloadSpaces]);

  /** 이미 등록해 둔 다른 화분을 어떤 계획의 화분으로 캔버스에 올린다. */
  const attachPlanter = useCallback((spaceId: string, seasonId: string) => {
    membership.attachSpace(spaceId, seasonId);
  }, [membership]);

  /** 캔버스에서 내린다. 작물이 남아 있으면 먼저 비우게 한다. */
  const detachPlanter = useCallback((spaceId: string): string | null => {
    if (placementsOf(state, spaceId).length > 0) {
      return "이 화분에 놓인 작물을 먼저 옮기거나 지워 주세요.";
    }
    membership.detachSpace(spaceId);
    mutate((draft) => {
      draft.planters = draft.planters.filter((item) => item.id !== spaceId);
      for (const group of draft.groups) {
        group.planterIds = group.planterIds.filter((item) => item !== spaceId);
      }
    });
    return null;
  }, [membership, mutate, state]);

  const editPlanter = useCallback(async (id: string, form: PlanterForm) => {
    const planter = findPlanter(state, id);
    const space = context?.allSpaces.find((item) => item.id === planter?.spaceId);
    if (!space) throw new Error("화분을 찾지 못했어요.");
    await updateGrowingSpace(space, toSpaceInput(form, space));
    await reloadSpaces();
    mutate((draft) => {
      const planter = draft.planters.find((item) => item.id === id);
      if (!planter) return;
      planter.cols = gridColumns(form.widthCm);
      planter.rows = gridRows(form.lengthCm);
      draft.placements = draft.placements.filter((item) => (
        item.planterId !== id || (item.col < planter.cols && item.row < planter.rows)
      ));
    });
  }, [context, mutate, reloadSpaces, state]);

  const removePlanter = useCallback(async (id: string) => {
    const planter = findPlanter(state, id);
    const space = context?.allSpaces.find((item) => item.id === planter?.spaceId);
    if (!space) throw new Error("화분을 찾지 못했어요.");
    if (placementsOf(state, id).length > 0) {
      notify("화분에 놓인 작물도 함께 지워집니다. 저장을 눌러야 서버 배치에 반영됩니다.");
    }
    await deleteGrowingSpace(space);
    membership.detachSpace(id);
    await reloadSpaces();
    mutate((draft) => {
      draft.planters = draft.planters.filter((item) => item.id !== id);
      draft.placements = draft.placements.filter((item) => item.planterId !== id);
      for (const group of draft.groups) {
        group.planterIds = group.planterIds.filter((item) => item !== id);
      }
    });
  }, [context, membership, mutate, notify, reloadSpaces, state]);

  const groups = useGroupActions(mutate);

  return {
    ...groups,
    placeCrop, moveCrop, deleteCrops, duplicateCrop, autoSpace,
    movePlanter, arrange,
    addPlanter, editPlanter, removePlanter, attachPlanter, detachPlanter,
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toSpaceInput(form: PlanterForm, space: GrowingSpace | null): GrowingSpaceInput {
  return {
    name: form.name.trim() || "새 화분",
    type: form.type,
    sunlight: form.sunlight,
    widthCm: Math.round(form.widthCm),
    lengthCm: Math.round(form.lengthCm),
    depthCm: form.depthCm === null ? null : Math.round(form.depthCm),
    address: form.address.trim() || null,
    latitude: space?.latitude ?? null,
    longitude: space?.longitude ?? null,
    orientation: space?.orientation ?? null,
    shadeLevel: space?.shadeLevel ?? null,
    estimatedSunlightHours: space?.estimatedSunlightHours ?? null,
    notes: space?.notes ?? "",
  };
}
