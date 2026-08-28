"use client";

import { useEffect } from "react";
import type { StudioController } from "./use-studio-controller";

/**
 * 단축키
 *
 * Space: 화면 이동, 0: 배율 초기화, F: 전체 보기, +/-: 확대·축소,
 * Delete/Backspace: 선택한 그룹 또는 작물 삭제
 */
export function useStudioKeys(studio: StudioController) {
  const { view, selection, actions, setHandMode, select, notify } = studio;

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      return target instanceof HTMLElement
        && (target.matches("input, textarea, select") || target.isContentEditable);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.type === "group" && selection.ids.length === 1) {
          actions.deleteGroup(selection.ids[0]);
          select(null, null);
          notify("그룹을 삭제했습니다. 화분과 작물은 그대로 남아 있습니다.");
          event.preventDefault();
          return;
        }
        if (selection.type === "crop" && selection.ids.length > 0) {
          actions.deleteCrops(selection.ids);
          select(null, null);
          event.preventDefault();
          return;
        }
      }

      if (event.code === "Space") { setHandMode(true); event.preventDefault(); return; }
      if (event.key === "0") view.reset();
      if (event.key === "f" || event.key === "F") view.fit(studio.state.planters, studio.canvasTopInset);
      if (event.key === "+" || event.key === "=") view.zoomCentre(0.1);
      if (event.key === "-") view.zoomCentre(-0.1);
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setHandMode(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [actions, notify, select, selection, setHandMode, studio.canvasTopInset, studio.state.planters, view]);
}
