"use client";

import { placementsOf } from "@/features/placement-studio/domain/studio-model";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/** 레이어 / 화분 목록 */
export function LayersPanel({ studio }: { studio: StudioController }) {
  return (
    <>
      <h2 className={styles.panelTitle}>레이어 / 화분 목록</h2>
      {studio.state.planters.map((planter) => {
        const names = placementsOf(studio.state, planter.id)
          .map((placement) => studio.context?.cropsById.get(placement.cropId)?.name ?? placement.cropId);

        return (
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
            <small>{names.join(" · ") || "비어 있음"}</small>
          </button>
        );
      })}

      {studio.state.groups.length > 0 && (
        <>
          <div className={styles.sectionTitle}>그룹</div>
          {studio.state.groups.map((group) => (
            <button
              className={styles.planterRow}
              key={group.id}
              onClick={() => studio.select("group", group.id)}
              type="button"
            >
              <strong>▣ {group.name}</strong>
              <small>{group.planterIds.length}개 화분</small>
            </button>
          ))}
        </>
      )}
    </>
  );
}
