"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { findPlanter } from "@/features/placement-studio/domain/studio-model";
import { useStudioController, type StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { StudioCanvas } from "./studio-canvas";
import { StudioInspector } from "./studio-inspector";
import { MobileSelectionBar, StudioSheet } from "./studio-mobile";
import { StudioPanel } from "./studio-panel";
import { StudioBottomTools, StudioRail } from "./studio-rail";
import { StudioTopbar } from "./studio-topbar";
import { useStudioKeys } from "../hooks/use-studio-keys";
import styles from "./placement-studio.module.css";

/**
 * 작물 배치 편집기
 *
 * 첨부한 프로토타입의 화면 구조·조작 방식을 그대로 옮기되, 값은 전부 실제 API 에서 온다.
 * 임시 데이터·localStorage 저장·가짜 AI 는 쓰지 않는다.
 */
export function PlacementStudio({ initialPlanId }: { initialPlanId?: string }) {
  const studio = useStudioController(initialPlanId);
  const { load } = studio.store;

  if (load.status === "loading") {
    return <div className={styles.state} role="status">배치 편집기를 불러오고 있어요.</div>;
  }
  if (load.status === "error") {
    return (
      <div className={styles.state} role="alert">
        <p>{load.message}</p>
        <Link className={styles.stateAction} href="/dashboard">홈으로</Link>
      </div>
    );
  }
  if (load.status === "empty") {
    return (
      <div className={styles.state}>
        <p>아직 등록된 화분이 없어요.</p>
        <Link className={styles.stateAction} href="/spaces/new">화분 추가하기</Link>
      </div>
    );
  }

  return <StudioShell studio={studio} />;
}

function StudioShell({ studio }: { studio: StudioController }) {
  const router = useRouter();
  useStudioKeys(studio);

  useEffect(() => {
    if (!studio.store.dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [studio.store.dirty]);

  function leave() {
    if (studio.store.dirty && !window.confirm("저장하지 않은 변경사항이 있어요. 저장하지 않고 나갈까요?")) return;
    router.push("/dashboard");
  }

  /** 칸을 눌렀을 때: 추천 이동 → 모바일 이동 → 작물 배치 → 화분 선택 */
  function activateCell(planterId: string, col: number, row: number) {
    const recommendation = studio.recommendation;
    if (recommendation) {
      const hit = recommendation.cells.find((cell) => (
        cell.planterId === planterId && cell.col === col && cell.row === row
      ));
      if (hit) {
        studio.clearRecommendations();
        moveCrop(recommendation.sourceId, planterId, col, row);
        return;
      }
    }
    if (studio.mobileMoveId) {
      moveCrop(studio.mobileMoveId, planterId, col, row);
      studio.setMobileMoveId(null);
      return;
    }
    if (studio.tool === "crop" && studio.selectedCropId) {
      placeCrop(studio.selectedCropId, planterId, col, row);
      return;
    }
    studio.select("planter", planterId);
  }

  function placeCrop(cropId: string, planterId: string, col: number, row: number) {
    const result = studio.actions.placeCrop(cropId, planterId, col, row);
    if (!result.ok) { studio.notify(result.message); return; }
    // 프로토타입처럼 방금 놓은 작물을 바로 선택해 적합도를 보여 준다.
    studio.select("crop", result.id);
    studio.notify("작물을 선택한 칸 정중앙에 배치했습니다.");
  }

  function moveCrop(placementId: string, planterId: string, col: number, row: number) {
    const message = studio.actions.moveCrop(placementId, planterId, col, row);
    if (message) { studio.notify(message); return; }
    studio.select("crop", placementId);
    studio.notify("작물을 칸 정중앙으로 옮겼습니다.");
  }

  return (
    <div className={styles.studio}>
      <StudioTopbar onLeave={leave} studio={studio} />

      <main className={styles.workspace}>
        <StudioRail studio={studio} />
        <aside className={styles.sidepanel}><StudioPanel studio={studio} /></aside>

        <section className={styles.canvasShell}>
          <CanvasTools studio={studio} />
          <div className={styles.hint}>
            화분: 자유 드래그 · Shift+드래그: 10px 스냅 · 작물: 같은 계획 안에서 칸→칸 드래그 · 휠: 확대/축소
          </div>
          <AttachBar studio={studio} />
          <RecommendLegend studio={studio} />

          <StudioCanvas
            cropsById={studio.context?.cropsById ?? new Map()}
            plans={studio.context?.plans ?? []}
            handMode={studio.handMode}
            memos={studio.memos.memos}
            mobileMoveId={studio.mobileMoveId}
            onCellActivate={activateCell}
            onCreateGroup={(rect) => {
              const id = studio.actions.createGroup(rect);
              if (!id) { studio.notify("조금 더 크게 드래그해 그룹을 만들어 주세요."); return; }
              studio.select("group", id);
              studio.notify("그룹을 만들었습니다. 화분을 안으로 끌어 넣거나 밖으로 빼보세요.");
            }}
            onDeselect={() => studio.select(null, null)}
            onDropCropId={placeCrop}
            onMoveCrop={moveCrop}
            onMoveGroup={studio.actions.moveGroup}
            onMovePlanter={studio.actions.movePlanter}
            onNotice={studio.notify}
            onPan={studio.view.panBy}
            onResizeGroup={studio.actions.resizeGroup}
            onSelectCrop={studio.toggleCrop}
            onSelectGroup={(id) => studio.select("group", id)}
            onSelectMemo={(id) => studio.select("note", id)}
            onSelectPlanter={studio.selectPlanterOnCanvas}
            recommendation={studio.recommendation}
            selection={studio.selection}
            state={studio.state}
            statusByPlacementId={studio.statusByPlacementId}
            tool={studio.tool}
            view={studio.view.view}
            viewportRef={studio.viewportRef}
          />
        </section>

        <aside className={styles.inspector}><StudioInspector studio={studio} /></aside>
      </main>

      <SummaryBar studio={studio} />
      <StudioBottomTools studio={studio} />
      <StudioSheet studio={studio} />
      <MobileSelectionBar studio={studio} />

      {studio.toast && <div className={styles.toast} role="status">{studio.toast}</div>}
    </div>
  );
}

function CanvasTools({ studio }: { studio: StudioController }) {
  const { view } = studio;

  return (
    <div className={styles.canvasTools}>
      <button
        className={studio.handMode ? styles.toolOn : ""}
        onClick={() => studio.setHandMode(!studio.handMode)}
        title="화면 이동"
        type="button"
      >
        ✋
      </button>
      <button
        className={studio.handMode ? "" : styles.toolOn}
        onClick={() => { studio.setHandMode(false); studio.setTool("select"); }}
        title="선택"
        type="button"
      >
        ↖
      </button>
      <button onClick={() => view.zoomCentre(-0.1)} title="축소" type="button">−</button>
      <button className={styles.zoomtext} onClick={view.reset} title="100%로" type="button">
        {Math.round(view.view.zoom * 100)}%
      </button>
      <button onClick={() => view.zoomCentre(0.1)} title="확대" type="button">＋</button>
      <button onClick={() => view.fit(studio.state.planters, studio.canvasTopInset)} title="전체 보기" type="button">⌗</button>
      <button onClick={view.reset} title="초기화" type="button">⟳</button>
      <button
        onClick={() => { studio.actions.arrange(); studio.notify("화분을 다시 정렬했습니다."); }}
        title="화분 자동 정렬"
        type="button"
      >
        ▦
      </button>
    </div>
  );
}

/**
 * 이 계획에 아직 올리지 않은 화분이 있으면 캔버스 위에 바로 알려 준다.
 *
 * 배치 편집기의 기준 단위는 화분 하나가 아니라 재배 계획 하나다.
 * 화분 패널을 열어 보지 않아도 여러 화분을 한 캔버스에 올릴 수 있어야 한다.
 */
function planLabel(studio: StudioController): string {
  return studio.context?.plans.find((plan) => plan.id === studio.targetPlanId)?.name ?? "재배 계획";
}

function AttachBar({ studio }: { studio: StudioController }) {
  const others = studio.otherSpaces;
  if (others.length === 0) return null;

  return (
    <div className={styles.attachBar}>
      <span className={styles.attachCopy}>
        캔버스의 화분 <b>{studio.state.planters.length}개</b>
        {" · "}
        <b>{planLabel(studio)}</b>
        {"에 더 올릴 수 있는 화분 "}
        <b>{others.length}개</b>
      </span>
      {others.slice(0, 3).map((space) => (
        <button
          className={styles.attachChip}
          key={space.id}
          onClick={() => {
            studio.attachAndFit(space.id);
            studio.notify(`${space.name}을(를) 이 계획의 캔버스에 올렸습니다.`);
          }}
          type="button"
        >
          ＋ {space.name}
        </button>
      ))}
      {others.length > 3 && (
        <button
          className={styles.attachChip}
          onClick={() => { studio.setTool("planter"); studio.setSheet("planter"); }}
          type="button"
        >
          전체 보기
        </button>
      )}
    </div>
  );
}

function RecommendLegend({ studio }: { studio: StudioController }) {
  const recommendation = studio.recommendation;
  if (!recommendation) return null;

  const best = recommendation.cells[0];
  const crop = studio.context?.cropsById.get(recommendation.cropId);
  const planter = best ? findPlanter(studio.state, best.planterId) : undefined;

  return (
    <div className={styles.recommendLegend}>
      <div className={styles.recHead}>
        <strong>{crop?.name ?? "작물"} 추천 위치</strong>
        <button aria-label="추천 닫기" onClick={studio.clearRecommendations} type="button">×</button>
      </div>
      <div className={styles.recCopy}>
        {best
          ? `1순위: ${planter?.name ?? ""} · ${best.col + 1}열 ${best.row + 1}행 · 적합도 ${best.score}점`
          : "추천 가능한 빈 칸이 없습니다."}
        <br />
        칸을 누르면 그 자리로 옮기고 적합도를 다시 계산합니다.
      </div>
    </div>
  );
}

function SummaryBar({ studio }: { studio: StudioController }) {
  const { counts } = studio;

  return (
    <div className={styles.summaryBar}>
      <span className={styles.summaryItem}>
        <i className={`${styles.summaryDot} ${styles.dotGood}`} />적합 <b>{counts.good}</b>
      </span>
      <span className={styles.summaryItem}>
        <i className={`${styles.summaryDot} ${styles.dotWarning}`} />주의 <b>{counts.warning}</b>
      </span>
      <span className={styles.summaryItem}>
        <i className={`${styles.summaryDot} ${styles.dotBad}`} />부적합 <b>{counts.bad}</b>
      </span>
      <span className={styles.summaryItem}>화분 <b>{studio.state.planters.length}</b></span>
      <span className={styles.summaryItem}>작물 <b>{studio.state.placements.length}</b></span>
      <span className={styles.summaryNote}>
        {studio.store.saveError ?? "간격·깊이·햇빛·계절·지지 구조를 프론트엔드 규칙으로 계산합니다."}
      </span>
    </div>
  );
}
