"use client";

import { useState } from "react";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import { CropVisual } from "@/features/crop-catalog/components/crop-visual";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import {
  computeContainerGrid,
  isCellOccupied,
  recommendCellsForCrop,
  validateCellPlacement,
  type FitLevel,
  type GridCell,
} from "@/features/container-placement/domain/container-placement-grid";
import { MAX_QUANTITY, type ContainerPlacementRow } from "@/features/container-placement/domain/container-placement";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import styles from "./container-grid-canvas.module.css";

const CELL_PX = 30;
const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5] as const;

const FIT_LABEL: Record<FitLevel, string> = { good: "적합", warning: "주의", bad: "부적합", unknown: "확인 불가" };

/**
 * 화분(공간) 하나를 격자 캔버스로 그린다.
 *
 * 참고한 팀원 프로토타입은 화분 안에 여러 개별 화분(planter)을 자유
 * 배치했지만, 그건 지금 DB에 없는 개념이라 이번 범위에서 뺐다 — 대신
 * 이미 있는 재배 공간 자체를 격자 하나로 그린다. 칸 크기는 10cm 고정.
 */
export function ContainerGridCanvas({
  activeCrop,
  crops,
  isDropHover,
  onDropAtCell,
  onQuantityChange,
  onRemoveRow,
  onSelectCell,
  rows,
  selectedKey,
  space,
}: {
  /** 지금 배치하려는 작물(추천 칸 하이라이트용). 없으면 null. */
  activeCrop: CropReference | null;
  crops: readonly CropReference[];
  isDropHover: boolean;
  onDropAtCell: (spaceId: string, cell: GridCell) => void;
  onQuantityChange: (rowKey: string, quantity: number) => void;
  onRemoveRow: (rowKey: string) => void;
  onSelectCell: (rowKey: string | null) => void;
  rows: readonly ContainerPlacementRow[];
  selectedKey: string | null;
  space: GrowingSpace;
}) {
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_STEPS[zoomIndex];
  const grid = computeContainerGrid(space);

  const occupied = rows.flatMap((row) => row.cells.map((cell) => ({ ...cell, cropId: row.cropId, rowKey: row.key })));
  const cropOf = (cropId: string) => crops.find((crop) => crop.id === cropId);

  const recommendations = activeCrop
    ? recommendCellsForCrop(
      {
        id: activeCrop.id,
        plantSpacingCm: activeCrop.plantSpacingCm,
        minPotDepthCm: activeCrop.minPotDepthCm,
        sunRequirement: activeCrop.sunRequirement,
      },
      space,
      grid,
      occupied,
    )
    : [];
  const bestTwoKeys = new Set(recommendations.slice(0, 2).map((item) => `${item.cell.col}:${item.cell.row}`));
  const badKeys = new Set(
    recommendations.filter((item) => item.validation.overall === "bad").map((item) => `${item.cell.col}:${item.cell.row}`),
  );

  const selectedRow = rows.find((row) => row.key === selectedKey);
  const selectedCrop = selectedRow ? cropOf(selectedRow.cropId) : undefined;
  const selectedCell = selectedRow?.cells[0];
  const selectedValidation = selectedRow && selectedCrop && selectedCell
    ? validateCellPlacement(
      selectedCell,
      { id: selectedCrop.id, plantSpacingCm: selectedCrop.plantSpacingCm, minPotDepthCm: selectedCrop.minPotDepthCm, sunRequirement: selectedCrop.sunRequirement },
      space,
      grid,
      occupied.filter((cell) => cell.rowKey !== selectedRow.key),
    )
    : null;

  return (
    <div className={`${styles.canvas} ${isDropHover ? styles.dropHover : ""}`} data-drop-space={space.id}>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          <p>{space.name}</p>
          <span>{GROWING_SPACE_LABELS[space.type]} · {space.widthCm}×{space.lengthCm}cm · {grid.columns}×{grid.rows}칸</span>
        </div>
        <div className={styles.zoom}>
          <button
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
            type="button"
            aria-label="축소"
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))}
            type="button"
            aria-label="확대"
          >
            ＋
          </button>
        </div>
      </div>

      <div className={styles.scroll}>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${grid.columns}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${grid.rows}, ${CELL_PX}px)`,
            transform: `scale(${zoom})`,
          }}
        >
          {Array.from({ length: grid.rows }).flatMap((_, rowIndex) =>
            Array.from({ length: grid.columns }).map((__, colIndex) => {
              const cell = { col: colIndex, row: rowIndex };
              const key = `${colIndex}:${rowIndex}`;
              const filled = occupied.find((item) => item.col === colIndex && item.row === rowIndex);
              const crop = filled ? cropOf(filled.cropId) : undefined;
              const isSelected = filled && filled.rowKey === selectedKey;
              const recommendClass = bestTwoKeys.has(key)
                ? styles.recommend1
                : badKeys.has(key)
                  ? styles.recommendBad
                  : "";

              return (
                <button
                  className={[
                    styles.cell,
                    filled ? styles.filled : styles.empty,
                    isSelected ? styles.selected : "",
                    recommendClass,
                  ].filter(Boolean).join(" ")}
                  data-cell={key}
                  key={key}
                  onClick={() => {
                    if (filled) {
                      onSelectCell(filled.rowKey === selectedKey ? null : filled.rowKey);
                    } else if (activeCrop) {
                      onDropAtCell(space.id, cell);
                    }
                  }}
                  type="button"
                  aria-label={crop ? `${crop.name} · ${colIndex + 1}열 ${rowIndex + 1}행` : `빈 칸 · ${colIndex + 1}열 ${rowIndex + 1}행`}
                >
                  {crop
                    ? <span className={styles.cellArt}><CropVisual compact crop={crop} /></span>
                    : activeCrop && <span className={styles.cellPlus} aria-hidden="true">+</span>}
                </button>
              );
            }),
          )}
        </div>
      </div>

      {selectedRow && selectedCrop && (
        <div className={styles.inspector}>
          <div className={styles.inspectorHead}>
            <strong>{selectedCrop.name}</strong>
            <button className={styles.remove} onClick={() => onRemoveRow(selectedRow.key)} type="button">삭제</button>
          </div>
          <div className={styles.inspectorRow}>
            <span>수량</span>
            <input
              aria-label={`${selectedCrop.name} 수량`}
              className={styles.qty}
              max={MAX_QUANTITY}
              min={1}
              onChange={(event) => onQuantityChange(selectedRow.key, Number(event.target.value))}
              type="number"
              value={selectedRow.quantity}
            />
            <span>포기</span>
          </div>
          {selectedValidation && (
            <div className={styles.badges}>
              <span className={`${styles.badge} ${styles[selectedValidation.depth]}`}>화분 깊이 {FIT_LABEL[selectedValidation.depth]}</span>
              <span className={`${styles.badge} ${styles[selectedValidation.sun]}`}>햇빛 {FIT_LABEL[selectedValidation.sun]}</span>
              <span className={`${styles.badge} ${styles[selectedValidation.spacing]}`}>간격 {FIT_LABEL[selectedValidation.spacing]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function isCellFilled(cell: GridCell, occupied: readonly (GridCell & { cropId: string })[]): boolean {
  return isCellOccupied(cell, occupied);
}
