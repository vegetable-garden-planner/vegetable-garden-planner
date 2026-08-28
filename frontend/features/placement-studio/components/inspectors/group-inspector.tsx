"use client";

import { useState } from "react";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/** 화분 그룹 (Figma Frame) */
export function GroupInspector({ studio, id }: { studio: StudioController; id: string }) {
  const group = studio.state.groups.find((item) => item.id === id);
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  if (!group) return null;

  const name = draft && draft.id === id ? draft.name : group.name;

  return (
    <>
      <div className={styles.inspectorHead}>
        <h3>화분 그룹</h3>
        <span className={styles.groupCount}>{group.planterIds.length}개</span>
      </div>

      <div className={styles.insSection}>
        <div className={styles.label}>그룹 이름</div>
        <input className={styles.field} onChange={(event) => setDraft({ id, name: event.target.value })} value={name} />

        <div className={styles.label}>그룹 영역</div>
        <div className={styles.spaceStats}>
          <div className={styles.spaceStat}><small>가로</small><strong>{Math.round(group.w)}px</strong></div>
          <div className={styles.spaceStat}><small>세로</small><strong>{Math.round(group.h)}px</strong></div>
        </div>

        <div className={styles.groupMemberHint}>
          선택된 그룹 테두리의 8개 손잡이를 끌면 Figma Frame 처럼 영역 크기가 바뀝니다.
          화분의 실제 cm 크기는 절대 바뀌지 않습니다.<br /><br />
          화분 중심이 영역 안에 들어오면 자동 포함되고, 밖으로 빼면 자동 제외됩니다.
        </div>

        <div className={styles.label}>포함된 화분 ({group.planterIds.length})</div>
        {group.planterIds.length === 0 && <div className={styles.muted}>아직 포함된 화분이 없습니다.</div>}
        {group.planterIds.map((planterId) => (
          <div className={styles.linkedTarget} key={planterId}>
            {studio.state.planters.find((item) => item.id === planterId)?.name ?? planterId}
          </div>
        ))}
      </div>

      <button
        className={styles.groupCreateBtn}
        onClick={() => {
          studio.setTool("group");
          studio.select(null, null);
          studio.notify("캔버스 빈 곳을 드래그해 새 그룹을 만드세요.");
        }}
        type="button"
      >
        ＋ 새 그룹 하나 더 만들기
      </button>

      <div className={styles.actions}>
        <button
          className={styles.btn}
          onClick={() => { studio.actions.renameGroup(id, name); studio.notify("그룹 이름을 바꿨습니다."); }}
          type="button"
        >
          이름 수정
        </button>
        <button
          className={styles.dangerBtn}
          onClick={() => {
            studio.actions.deleteGroup(id);
            studio.select(null, null);
            studio.notify("그룹만 삭제했습니다. 화분과 작물은 그대로 남아 있습니다.");
          }}
          type="button"
        >
          그룹 삭제
        </button>
      </div>
    </>
  );
}
