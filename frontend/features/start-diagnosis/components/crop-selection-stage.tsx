"use client";

import Image from "next/image";
import { useState } from "react";
import {
  CROP_OPTIONS,
  getCropOption,
  type CropId,
} from "@/features/start-diagnosis/data/crop-selection";
import { CropGardenViewport } from "./crop-garden-viewport";
import styles from "./crop-selection-stage.module.css";

export function CropSelectionStage({
  onAdvance,
  onBack,
  onToggle,
  selectedCrops,
}: {
  onAdvance: () => void;
  onBack: () => void;
  onToggle: (cropId: CropId) => void;
  selectedCrops: readonly CropId[];
}) {
  const [attentionCrop, setAttentionCrop] = useState<CropId>();

  function focusFirstUnselectedCrop() {
    const firstUnselected = CROP_OPTIONS.find((crop) => !selectedCrops.includes(crop.id));
    if (!firstUnselected) return;

    setAttentionCrop(firstUnselected.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`crop-card-${firstUnselected.id}`)?.focus();
    });
    window.setTimeout(() => setAttentionCrop(undefined), 900);
  }

  return (
    <div className={styles.stage}>
      <div aria-label="진행률 3/3" className={styles.progress}>
        <p><strong>03</strong><span> / 03</span></p>
        <i aria-hidden="true"><b /></i>
      </div>

      <section className={styles.content}>
        <header className={styles.heading}>
          <h1>처음 키울 작물을<br />골라주세요</h1>
          <p>초보자도 쉽게 키울 수 있는 작물들이에요.<br />관심 있는 작물을 선택하고 나만의 첫 텃밭을 만들어보세요.</p>
        </header>

        <div aria-label="처음 키울 작물" className={styles.cropGrid}>
          {CROP_OPTIONS.map((crop) => {
            const selected = selectedCrops.includes(crop.id);
            return (
              <button
                aria-pressed={selected}
                className={`${styles.cropCard} ${selected ? styles.selectedCard : ""} ${attentionCrop === crop.id ? styles.attentionCard : ""}`}
                id={`crop-card-${crop.id}`}
                key={crop.id}
                onClick={() => onToggle(crop.id)}
                type="button"
              >
                <Image alt="" className={styles.cropImage} fill sizes="(max-width: 900px) 42vw, 200px" src={crop.image} />
                <span className={styles.cropShade} aria-hidden="true" />
                <span className={styles.cropMeta}>
                  <strong>{crop.name}</strong>
                  <small data-difficulty={crop.difficulty}>{crop.difficulty}</small>
                </span>
                <b aria-hidden="true" className={styles.check}>{selected ? "✓" : ""}</b>
              </button>
            );
          })}
        </div>

        <div className={styles.navigation}>
          <button className={styles.backButton} onClick={onBack} type="button">
            <span aria-hidden="true">←</span> 이전
          </button>
          <button
            className={styles.createButton}
            disabled={selectedCrops.length === 0}
            onClick={onAdvance}
            type="button"
          >
            첫 텃밭 생성하기 <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <CropGardenViewport selectedCrops={selectedCrops} />

      <section aria-label="선택한 작물" className={styles.selectedBar}>
        <p>선택한 작물 <strong>{selectedCrops.length}</strong><span> / {CROP_OPTIONS.length}</span></p>
        <div className={styles.chipList}>
          {selectedCrops.map((cropId) => {
            const crop = getCropOption(cropId);
            return (
              <span className={styles.chip} key={crop.id}>
                <span className={styles.chipImage}>
                  <Image alt="" fill sizes="32px" src={crop.image} />
                </span>
                <span>{crop.name}</span>
                <button aria-label={`${crop.name} 선택 해제`} onClick={() => onToggle(crop.id)} type="button">×</button>
              </span>
            );
          })}
          <button
            aria-label="선택하지 않은 작물 카드로 이동"
            className={styles.addButton}
            disabled={selectedCrops.length === CROP_OPTIONS.length}
            onClick={focusFirstUnselectedCrop}
            type="button"
          >
            +
          </button>
        </div>
      </section>
    </div>
  );
}
