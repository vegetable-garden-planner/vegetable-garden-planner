"use client";

import { useState } from "react";
import { placementsOf } from "@/features/placement-studio/domain/studio-model";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { CropImage } from "../crop-image";
import styles from "../placement-studio.module.css";

/** 작물 목록. 카드를 누르면 배치할 작물이 선택되고, 끌어서 칸에 놓을 수도 있다. */
export function CropPanel({ studio }: { studio: StudioController }) {
  const [query, setQuery] = useState("");
  const crops = studio.context?.crops ?? [];
  const keyword = query.trim().toLocaleLowerCase("ko-KR");
  const shown = keyword
    ? crops.filter((crop) => `${crop.name}${crop.familyName}`.toLocaleLowerCase("ko-KR").includes(keyword))
    : crops;

  return (
    <>
      <h2 className={styles.panelTitle}>작물 목록</h2>
      <div className={styles.search}>
        <input
          aria-label="작물 검색"
          className={styles.field}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="작물 검색"
          value={query}
        />
      </div>

      <div className={styles.sectionTitle}>작물 {shown.length}종</div>
      <div className={styles.cropGrid}>
        {shown.map((crop) => (
          <button
            className={`${styles.cropCard} ${studio.selectedCropId === crop.id ? styles.cropCardSelected : ""}`}
            draggable
            key={crop.id}
            onClick={() => {
              studio.setSelectedCropId(crop.id);
              studio.setTool("crop");
              studio.notify(`${crop.name} 선택 · 원하는 빈 칸을 누르세요`);
            }}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/crop-id", crop.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
            type="button"
          >
            <CropImage cropId={crop.id} imageClass="" letterClass={styles.cropBadge} name={crop.name} />
            <strong>{crop.name}</strong>
            <small>{crop.plantSpacingCm}cm · {crop.familyName}</small>
          </button>
        ))}
      </div>

      <div className={styles.planterList}>
        <div className={`${styles.sectionTitle} ${styles.sectionTitleFlat}`}>
          내 화분 ({studio.state.planters.length})
        </div>
        {studio.state.planters.map((planter) => (
          <button
            className={styles.planterRow}
            key={planter.id}
            onClick={() => {
              studio.select("planter", planter.id);
              studio.view.focus(planter);
              studio.setSheet(null);
            }}
            type="button"
          >
            <strong>▾ {planter.name}</strong>
            <small>
              {planter.w}×{planter.h}{planter.d === null ? "" : `×${planter.d}`}cm
              {" · "}
              {placementsOf(studio.state, planter.id).length}포기
            </small>
          </button>
        ))}
      </div>
    </>
  );
}
