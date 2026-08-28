"use client";

import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import styles from "../placement-studio.module.css";

/** 화분 그룹 (Figma 의 Frame 처럼 쓴다) */
export function GroupPanel({ studio }: { studio: StudioController }) {
  return (
    <>
      <h2 className={styles.panelTitle}>화분 그룹</h2>
      <div className={styles.groupHelp}>
        <b>Figma의 Frame처럼 사용합니다.</b><br />
        그룹 도구를 선택한 상태에서 캔버스의 빈 곳을 드래그해 영역을 만드세요.<br /><br />
        화분을 영역 안으로 끌어 넣으면 자동 포함되고, 밖으로 빼면 자동 제외됩니다.
      </div>

      <button
        className={styles.groupCreateBtn}
        onClick={() => {
          studio.setTool("group");
          studio.select(null, null);
          studio.setSheet(null);
          studio.notify("캔버스의 빈 곳을 드래그해 새 그룹을 만드세요.");
        }}
        type="button"
      >
        ＋ 새 그룹 그리기
      </button>

      <div className={styles.sectionTitle}>현재 그룹</div>
      {studio.state.groups.length === 0 && (
        <div className={styles.muted}>그룹이 없습니다. 새 그룹 그리기를 눌러 만들어보세요.</div>
      )}
      {studio.state.groups.map((group) => (
        <button
          className={`${styles.groupPanelItem} ${
            studio.selection.type === "group" && studio.selection.ids[0] === group.id
              ? styles.groupPanelItemSelected
              : ""
          }`}
          key={group.id}
          onClick={() => studio.select("group", group.id)}
          type="button"
        >
          <strong>{group.name}</strong>
          <small>{group.planterIds.length}개 화분 · {Math.round(group.w)}×{Math.round(group.h)} 영역</small>
        </button>
      ))}

      <div className={styles.groupMemberHint}>
        그룹은 화면에서 화분을 묶어 보기 위한 영역입니다. 현재 API 에는 그룹을 담을 자리가 없어
        이 기기에만 남고, 서버에는 저장되지 않습니다.
      </div>
    </>
  );
}
