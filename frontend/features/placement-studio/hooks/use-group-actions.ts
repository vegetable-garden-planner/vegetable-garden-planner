"use client";

import { useCallback } from "react";
import {
  isDrawable,
  nextGroupName,
  resizeRect,
  syncMembershipFromFrame,
  type Rect,
  type ResizeDir,
} from "@/features/placement-studio/domain/planter-group";
import type { StudioState } from "@/features/placement-studio/domain/studio-model";
import { nextId } from "./use-studio-store";

type Mutate = (recipe: (draft: StudioState) => void) => void;

/**
 * 화분 그룹 (Figma 의 Frame 방식)
 *
 * 캔버스 좌표(px)로만 존재하고 화분의 실제 cm 크기는 절대 바꾸지 않는다.
 * 소속은 사용자가 지정하지 않고 화분 중심점이 영역 안에 있는지로 정해진다.
 */
export function useGroupActions(mutate: Mutate) {
  const createGroup = useCallback((rect: Rect): string | null => {
    if (!isDrawable(rect)) return null;
    const id = nextId("group");
    mutate((draft) => {
      draft.groups.push({ id, name: nextGroupName(draft.groups), ...rect, planterIds: [] });
      syncMembershipFromFrame(draft, id);
    });
    return id;
  }, [mutate]);

  const moveGroup = useCallback((id: string, dx: number, dy: number) => {
    mutate((draft) => {
      const group = draft.groups.find((item) => item.id === id);
      if (!group) return;
      group.x += dx;
      group.y += dy;
      for (const planterId of group.planterIds) {
        const planter = draft.planters.find((item) => item.id === planterId);
        if (!planter) continue;
        planter.x += dx;
        planter.y += dy;
      }
    });
  }, [mutate]);

  /** 기준은 끌기를 시작한 순간의 크기다. 중간 값을 다시 기준으로 쓰면 크기가 누적된다. */
  const resizeGroup = useCallback((id: string, dir: ResizeDir, dx: number, dy: number, base: Rect) => {
    mutate((draft) => {
      const group = draft.groups.find((item) => item.id === id);
      if (!group) return;
      Object.assign(group, resizeRect(base, dir, dx, dy));
      syncMembershipFromFrame(draft, id);
    });
  }, [mutate]);

  const renameGroup = useCallback((id: string, name: string) => {
    mutate((draft) => {
      const group = draft.groups.find((item) => item.id === id);
      if (group) group.name = name.trim() || group.name;
    });
  }, [mutate]);

  /** 그룹만 지운다. 안에 있던 화분과 작물은 그대로 남는다. */
  const deleteGroup = useCallback((id: string) => {
    mutate((draft) => {
      draft.groups = draft.groups.filter((item) => item.id !== id);
    });
  }, [mutate]);

  return { createGroup, moveGroup, resizeGroup, renameGroup, deleteGroup };
}
