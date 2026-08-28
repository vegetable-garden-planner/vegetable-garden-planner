"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCultivationRecords } from "@/features/cultivation-record/hooks/use-cultivation-records";
import type { StudioState } from "@/features/placement-studio/domain/studio-model";
import {
  countValidations,
  recommendForCrop,
  validatePlacement,
  type OverallStatus,
  type ValidationInput,
} from "@/features/placement-studio/domain/validation";
import { NO_SELECTION, type RecommendationState, type Selection, type StudioTool } from "../components/studio-types";
import { useCanvasView } from "./use-canvas-view";
import { useStudioActions } from "./use-studio-actions";
import { useStudioMemos } from "./use-studio-memos";
import { useStudioStore, type StudioContext } from "./use-studio-store";

const EMPTY_STATE: StudioState = { planters: [], placements: [], groups: [] };

/**
 * 배치 편집기 전체를 묶는 곳
 *
 * 화면 상태(선택·도구·확대)와 데이터(실제 API)를 한 군데서 모아
 * 컴포넌트가 각자 API 를 부르지 않게 한다.
 */
/** 계획 필터. "all" 이면 모든 계획의 화분이 한 캔버스에 보인다. */
export type PlanFilter = string;

export function useStudioController(initialPlanId?: string) {
  const store = useStudioStore();
  const context: StudioContext | null = store.load.status === "ready" ? store.load.context : null;

  const [tool, setToolState] = useState<StudioTool>("crop");
  const [selection, setSelection] = useState<Selection>(NO_SELECTION);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationState | null>(null);
  const [handMode, setHandMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<StudioTool | "select" | null>(null);
  const [mobileMoveId, setMobileMoveId] = useState<string | null>(null);
  const [busyError, setBusyError] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<PlanFilter>(initialPlanId ?? "all");

  const viewportRef = useRef<HTMLDivElement>(null);
  const view = useCanvasView(viewportRef);

  const spaceIds = context?.spaces.map((space) => space.id) ?? [];
  const memos = useStudioMemos(spaceIds);

  /** 재배 기록은 계획에 종속된 데이터라 계획을 하나 골라야 한다. */
  const recordPlanId = planFilter !== "all"
    ? planFilter
    : context?.plans[0]?.id ?? "";
  const records = useCultivationRecords(recordPlanId);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const { attachSpace, detachSpace } = store;
  const membership = useMemo(() => ({
    attachSpace: (spaceId: string, seasonId: string) => attachSpace(seasonId, spaceId),
    detachSpace,
  }), [attachSpace, detachSpace]);
  const actions = useStudioActions(store.state, store.mutate, context, notify, store.reloadSpaces, membership);

  const validationInput: ValidationInput = useMemo(() => ({
    state: store.state,
    cropsById: context?.cropsById ?? new Map(),
  }), [context, store.state]);

  /** 화면에 보여 줄 화분. 필터를 걸어도 데이터는 그대로 두고 표시만 좁힌다. */
  const visibleState = useMemo(() => {
    if (planFilter === "all") return store.state;
    const planters = store.state.planters.filter((planter) => planter.seasonId === planFilter);
    const ids = new Set(planters.map((planter) => planter.id));
    return {
      planters,
      placements: store.state.placements.filter((item) => ids.has(item.planterId)),
      groups: store.state.groups,
    };
  }, [planFilter, store.state]);

  const statusByPlacementId = useMemo(() => {
    const map = new Map<string, OverallStatus>();
    for (const placement of store.state.placements) {
      const result = validatePlacement(validationInput, placement);
      if (result) map.set(placement.id, result.overall);
    }
    return map;
  }, [store.state.placements, validationInput]);

  const counts = useMemo(() => countValidations(validationInput), [validationInput]);

  /**
   * 이 계획에 아직 올리지 않은 화분.
   * 재배 계획 하나가 화분 하나에 묶여 보이지 않도록, 여기 있는 화분은 캔버스에서 바로 올릴 수 있다.
   */
  const otherSpaces = useMemo(() => {
    const plan = planFilter !== "all" ? planFilter : context?.plans[0]?.id;
    if (!plan) return [];
    const used = new Set(
      store.state.planters.filter((p) => p.seasonId === plan).map((p) => p.spaceId),
    );
    return (context?.allSpaces ?? []).filter(
      (space) => space.type !== "garden" && !used.has(space.id),
    );
  }, [context, planFilter, store.state.planters]);

  /** "화분을 올릴 계획" — 필터가 전체면 첫 계획을 기준으로 삼는다. */
  const targetPlanId = planFilter !== "all" ? planFilter : context?.plans[0]?.id ?? "";

  /** 캔버스 위 안내 막대가 차지하는 높이. 전체 보기에서 이만큼 비워 둔다. */
  const canvasTopInset = otherSpaces.length > 0 ? 108 : 0;

  /** 화분을 계획에 올린 뒤 새 화분까지 보이도록 다시 맞춘다. */
  const attachAndFit = useCallback((spaceId: string) => {
    actions.attachPlanter(spaceId, targetPlanId);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      view.fit(store.state.planters, canvasTopInset);
    }));
  }, [actions, canvasTopInset, store.state.planters, targetPlanId, view]);

  /* ------------------------------------------------------------ 선택 */

  const select = useCallback((type: Selection["type"], id: string | null) => {
    if (type !== "crop") setRecommendation(null);
    setSelection({ type, ids: id ? [id] : [] });
  }, []);

  /**
   * 캔버스에서 화분을 눌렀을 때만 쓴다.
   * 추천 칸을 누르면 그 칸이 속한 화분에 pointerdown 이 먼저 들어오는데,
   * 그때 추천 표시를 지우면 정작 이동이 되지 않는다.
   */
  const selectPlanterOnCanvas = useCallback((id: string) => {
    setSelection({ type: "planter", ids: [id] });
  }, []);

  const toggleCrop = useCallback((id: string, append: boolean) => {
    setSelection((current) => {
      if (!append || current.type !== "crop") return { type: "crop", ids: [id] };
      const next = new Set(current.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { type: "crop", ids: [...next] };
    });
  }, []);

  const setTool = useCallback((next: StudioTool) => {
    setToolState(next);
    setHandMode(false);
    if (next !== "crop") setSelectedCropId(null);
  }, []);

  /* ------------------------------------------------------------ 추천 */

  const showRecommendations = useCallback((placementId: string) => {
    const placement = store.state.placements.find((item) => item.id === placementId);
    if (!placement) return;
    const cells = recommendForCrop(validationInput, placement.cropId, placementId, 7);
    setRecommendation({ cropId: placement.cropId, sourceId: placementId, cells });
    setSheet(null);
    const crop = context?.cropsById.get(placement.cropId);
    notify(`${crop?.name ?? "작물"} 추천 위치를 표시했습니다.`);
  }, [context, notify, store.state.placements, validationInput]);

  const clearRecommendations = useCallback(() => setRecommendation(null), []);

  /* ------------------------------------------------------------ 화면 맞춤 */

  const fitted = useRef(false);
  const planters = store.state.planters;

  useEffect(() => {
    if (fitted.current || planters.length === 0) return;
    let frames = 0;
    let raf = 0;

    function attempt() {
      if (view.fit(planters, canvasTopInset)) {
        fitted.current = true;
        return;
      }
      frames += 1;
      if (frames < 30) raf = requestAnimationFrame(attempt);
    }

    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [canvasTopInset, planters, view]);

  return {
    store,
    context,
    state: store.load.status === "ready" ? visibleState : EMPTY_STATE,
    allState: store.state,
    actions,
    memos,
    records,
    view,
    viewportRef,
    tool,
    setTool,
    selection,
    select,
    selectPlanterOnCanvas,
    toggleCrop,
    selectedCropId,
    setSelectedCropId,
    recommendation,
    showRecommendations,
    clearRecommendations,
    handMode,
    setHandMode,
    toast,
    notify,
    sheet,
    setSheet,
    mobileMoveId,
    setMobileMoveId,
    busyError,
    setBusyError,
    validationInput,
    statusByPlacementId,
    counts,
    otherSpaces,
    recordPlanId,
    planFilter,
    setPlanFilter,
    targetPlanId,
    canvasTopInset,
    attachAndFit,
  };
}

export type StudioController = ReturnType<typeof useStudioController>;
