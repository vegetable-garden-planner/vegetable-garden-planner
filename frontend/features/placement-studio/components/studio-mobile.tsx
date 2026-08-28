"use client";

import { useRef } from "react";
import { findPlacement, findPlanter } from "@/features/placement-studio/domain/studio-model";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { CropImage } from "./crop-image";
import { dragOnWindow } from "./drag-controller";
import { StudioInspector } from "./studio-inspector";
import { StudioPanel } from "./studio-panel";
import styles from "./placement-studio.module.css";

/** 모바일 하단 시트: 도구 패널이나 정보 창을 담는다. */
export function StudioSheet({ studio }: { studio: StudioController }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const open = studio.sheet !== null;

  function beginHandleDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const startY = event.clientY;
    let dy = 0;
    const node = sheetRef.current;

    dragOnWindow({
      onMove: (move) => {
        dy = Math.max(0, move.clientY - startY);
        if (node) node.style.transform = `translateY(${dy}px)`;
      },
      onEnd: () => {
        if (node) node.style.transform = "";
        if (dy > 55) studio.setSheet(null);
      },
    });
  }

  return (
    <>
      <div
        className={`${styles.sheetBackdrop} ${open ? styles.sheetBackdropOpen : ""}`}
        onClick={() => studio.setSheet(null)}
        role="presentation"
      />
      <div className={`${styles.sheet} ${open ? styles.sheetOpen : ""}`} ref={sheetRef}>
        <button aria-label="패널 닫기" className={styles.handle} onPointerDown={beginHandleDrag} type="button" />
        <button aria-label="패널 닫기" className={styles.sheetClose} onClick={() => studio.setSheet(null)} type="button">×</button>
        <div className={styles.sheetbody}>
          {open && (studio.sheet === "select"
            ? <StudioInspector studio={studio} />
            : <StudioPanel studio={studio} />)}
        </div>
      </div>
    </>
  );
}

/** 모바일에서 작물을 고르면 뜨는 막대: 추천 · 이동 · 닫기 */
export function MobileSelectionBar({ studio }: { studio: StudioController }) {
  const moving = studio.mobileMoveId
    ? findPlacement(studio.state, studio.mobileMoveId)
    : undefined;

  if (moving) {
    const crop = studio.context?.cropsById.get(moving.cropId);
    return (
      <div className={`${styles.mobileSelectionBar} ${styles.mobileSelectionBarShow}`}>
        {crop && <CropImage cropId={crop.id} imageClass="" letterClass={styles.cropBadge} name={crop.name} />}
        <div className={styles.mobileSelectionCopy}>
          <strong>{crop?.name ?? "작물"} 이동 중</strong>
          <small>옮길 빈 칸을 터치하세요.</small>
        </div>
        <button className="cancel" onClick={() => studio.setMobileMoveId(null)} type="button">취소</button>
      </div>
    );
  }

  if (studio.selection.type !== "crop" || studio.selection.ids.length !== 1) return null;
  const placement = findPlacement(studio.state, studio.selection.ids[0]);
  if (!placement) return null;
  const crop = studio.context?.cropsById.get(placement.cropId);
  const planter = findPlanter(studio.state, placement.planterId);

  return (
    <div className={`${styles.mobileSelectionBar} ${styles.mobileSelectionBarShow}`}>
      {crop && <CropImage cropId={crop.id} imageClass="" letterClass={styles.cropBadge} name={crop.name} />}
      <div className={styles.mobileSelectionCopy}>
        <strong>{crop?.name ?? "작물"}</strong>
        <small>{planter?.name} · {placement.col + 1}열 {placement.row + 1}행</small>
      </div>
      <button className="recommend" onClick={() => studio.showRecommendations(placement.id)} type="button">추천</button>
      <button
        className="move"
        onClick={() => {
          studio.setMobileMoveId(placement.id);
          studio.setSheet(null);
          studio.notify("이동할 빈 칸을 터치하거나 작물을 직접 끌어 옮기세요.");
        }}
        type="button"
      >
        이동
      </button>
      <button onClick={() => { studio.select(null, null); studio.setMobileMoveId(null); }} type="button">×</button>
    </div>
  );
}
