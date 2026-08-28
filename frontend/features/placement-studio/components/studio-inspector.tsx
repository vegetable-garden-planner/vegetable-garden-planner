"use client";

import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { CropInspector } from "./inspectors/crop-inspector";
import { GroupInspector } from "./inspectors/group-inspector";
import { MemoInspector } from "./inspectors/memo-inspector";
import { OverviewInspector } from "./inspectors/overview-inspector";
import { PlanterInspector } from "./inspectors/planter-inspector";
import { RecordInspector } from "./inspectors/record-inspector";
import styles from "./placement-studio.module.css";

/** 오른쪽 정보 창. 선택한 것이 없으면 전체 분석을 보여 준다. */
export function StudioInspector({ studio }: { studio: StudioController }) {
  const { selection } = studio;

  if (selection.ids.length > 1) return <MultiSelection studio={studio} />;

  const id = selection.ids[0];
  if (!id) return <OverviewInspector studio={studio} />;

  switch (selection.type) {
    case "planter": return <PlanterInspector id={id} studio={studio} />;
    case "crop": return <CropInspector id={id} studio={studio} />;
    case "group": return <GroupInspector id={id} studio={studio} />;
    case "note": return <MemoInspector id={id} studio={studio} />;
    case "journal": return <RecordInspector id={id} studio={studio} />;
    default: return <OverviewInspector studio={studio} />;
  }
}

function MultiSelection({ studio }: { studio: StudioController }) {
  const ids = studio.selection.ids;

  return (
    <>
      <div className={styles.inspectorHead}><h3>{ids.length}개 항목 선택</h3></div>
      <div className={styles.insSection}>
        <div className={styles.muted}>선택한 작물을 빈 칸에 다시 흩어 놓거나 함께 삭제할 수 있습니다.</div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.btn}
          onClick={() => {
            studio.actions.autoSpace(ids);
            studio.notify("선택한 작물을 빈 칸에 다시 정리했습니다.");
          }}
          type="button"
        >
          자동 간격
        </button>
        <button
          className={styles.dangerBtn}
          onClick={() => {
            if (studio.selection.type === "crop") studio.actions.deleteCrops(ids);
            studio.select(null, null);
          }}
          type="button"
        >
          삭제
        </button>
      </div>
    </>
  );
}
