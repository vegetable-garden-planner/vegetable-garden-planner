"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useAllContainerPlacements } from "@/features/container-placement/hooks/use-all-container-placements";
import { CROP_ICONS } from "@/features/crop-catalog/data/crop-photos";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { useAllCultivationRecords } from "@/features/cultivation-record/hooks/use-all-cultivation-records";
import { useCultivationTasks } from "@/features/cultivation-schedule/hooks/use-cultivation-tasks";
import { formatLocalDateOnly } from "@/features/dashboard/domain/dashboard-alert";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import {
  createHomeHeadline,
  createHomePlanCards,
  type HomePlanCard,
  type HomePlanInput,
} from "@/features/home/domain/home-plan-card";
import { homeQuickActions } from "@/features/home/domain/home-search";
import { HomeSearchBar } from "./home-search-bar";
import styles from "./home-stage.module.css";

/**
 * 메인 홈 — 한 화면에서 "지금 키우는 재배 계획"만 본다.
 *
 * 카드에 들어가는 값은 전부 실제 저장 데이터에서 나온다.
 *   재배 계획 / 공간 / 배치 / 일정 / 기록
 * 시스템이 모르는 값(작물 건강 상태 같은 것)은 만들지 않고, 없는 항목은 그리지 않는다.
 *
 * 관리용 상세 정보는 여기 쌓지 않고 /mypage 가 맡는다.
 */
export function HomeStage() {
  const auth = useAuthSession();
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const layoutsState = useGardenLayouts();
  const tasksState = useCultivationTasks();
  const cropCatalog = useCropCatalog();
  const recordsState = useAllCultivationRecords();
  const placementsState = useAllContainerPlacements();

  const [index, setIndex] = useState(0);

  const resourceStates = [
    spacesState,
    seasonsState,
    layoutsState,
    tasksState,
    cropCatalog,
    recordsState,
    placementsState,
  ];
  const loadErrorMessage = auth.state.status === "error"
    ? auth.state.message
    : resourceStates.find((state) => state.status === "error")?.message;

  const today = formatLocalDateOnly(new Date());
  const input = collectHomeInput({
    cropCatalog,
    layoutsState,
    placementsState,
    recordsState,
    seasonsState,
    spacesState,
    tasksState,
  }, today);

  const ready = !loadErrorMessage && auth.state.status === "authenticated" && input !== null;
  const tasks = input?.tasks ?? [];
  const cards = ready && input ? createHomePlanCards(input) : [];

  const count = cards.length;
  // 계획이 줄어도(삭제 등) 중앙 위치가 범위 밖으로 나가지 않게 그릴 때 한 번 더 맞춘다.
  const safeIndex = count === 0 ? 0 : Math.min(index, count - 1);

  const move = useCallback((delta: number) => {
    setIndex((current) => {
      const from = count === 0 ? 0 : Math.min(current, count - 1);
      // 계획이 3개 이상이면 양옆이 항상 차도록 순환한다.
      // 2개일 때는 순환하면 같은 카드가 좌/우로 튀어 보여서 끝에서 멈춘다.
      if (count > 2) return (from + delta + count) % count;
      return Math.min(Math.max(from + delta, 0), Math.max(count - 1, 0));
    });
  }, [count]);

  if (loadErrorMessage) return <HomeLoadError detail={loadErrorMessage} />;
  if (!ready || !input) return <HomeLoading />;

  const todayTaskCount = tasks.filter(
    (task) => task.status === "pending" && task.dueDate <= today,
  ).length;
  const overdueTotal = cards.reduce((sum, card) => sum + card.overdueCount, 0);
  const headline = createHomeHeadline(cards, todayTaskCount);
  // 계획이 없을 때는 빈 상태 카드가 안내를 맡는다. 같은 말을 두 번 하지 않는다.
  const subline = count === 0
    ? null
    : overdueTotal > 0
      ? `기한이 지난 일이 ${overdueTotal}개 있어요.`
      : `${count}개의 재배 계획을 관리하고 있어요.`;

  return (
    <div className={styles.stage}>
      <span aria-hidden="true" className={styles.light} />
      <span aria-hidden="true" className={styles.leaves} />
      <span aria-hidden="true" className={styles.beam} />
      <span aria-hidden="true" className={styles.motes} />

      <div className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.greeting}>나의 재배 홈</p>
          <h1 className={styles.headline}>{headline}</h1>
          {subline && subline !== headline && <p className={styles.subline}>{subline}</p>}
        </div>

        <HomeSearchBar
          input={{
            cropImages: input.cropImages,
            crops: input.crops,
            seasons: input.seasons,
            spaceLabels: input.spaceLabels,
            spaces: input.spaces,
          }}
          quickActions={homeQuickActions(tasks, today)}
        />

        {count === 0
          ? <HomeEmpty />
          : (
            <HomeCarousel
              cards={cards}
              index={safeIndex}
              onMove={move}
              onSelect={setIndex}
            />
          )}
      </div>

      {/* 빈 상태에는 안내 카드 안에 같은 버튼이 있으므로 떠 있는 버튼은 두지 않는다 */}
      {count > 0 && (
        <Link className={styles.newPlan} href="/start">
          <b aria-hidden="true">+</b> 새 재배 시작
        </Link>
      )}
    </div>
  );
}

/**
 * 여덟 개 자료가 모두 준비됐을 때만 카드 계산에 넘길 값을 만든다.
 * 하나라도 아직이면 null 이고, 화면은 불러오는 중 상태로 남는다.
 */
function collectHomeInput(
  states: {
    cropCatalog: ReturnType<typeof useCropCatalog>;
    layoutsState: ReturnType<typeof useGardenLayouts>;
    placementsState: ReturnType<typeof useAllContainerPlacements>;
    recordsState: ReturnType<typeof useAllCultivationRecords>;
    seasonsState: ReturnType<typeof useGrowingSeasons>;
    spacesState: ReturnType<typeof useGrowingSpaces>;
    tasksState: ReturnType<typeof useCultivationTasks>;
  },
  today: string,
): HomePlanInput | null {
  const { cropCatalog, layoutsState, placementsState, recordsState, seasonsState, spacesState, tasksState } = states;
  if (
    cropCatalog.status !== "ready"
    || layoutsState.status !== "ready"
    || placementsState.status !== "ready"
    || recordsState.status !== "ready"
    || seasonsState.status !== "ready"
    || spacesState.status !== "ready"
    || tasksState.status !== "ready"
  ) {
    return null;
  }

  return {
    crops: cropCatalog.crops,
    // 작은 원형 자리라서 사진보다 컷 그림이 알아보기 좋다
    cropImages: CROP_ICONS,
    layouts: layoutsState.layouts,
    placements: placementsState.placements,
    records: recordsState.records,
    seasons: seasonsState.seasons,
    spaceLabels: GROWING_SPACE_LABELS,
    spaces: spacesState.spaces,
    tasks: tasksState.tasks,
    today,
  };
}

/* ------------------------------------------------------------ 캐러셀 */

function HomeCarousel({
  cards,
  index,
  onMove,
  onSelect,
}: {
  cards: HomePlanCard[];
  index: number;
  onMove: (delta: number) => void;
  onSelect: (next: number) => void;
}) {
  const count = cards.length;
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (count < 2) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, onMove]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
    onMove(dx < 0 ? 1 : -1);
  }

  return (
    <>
      <div
        aria-label="재배 계획 카드"
        aria-roledescription="캐러셀"
        className={styles.deck}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        role="group"
      >
        <span aria-hidden="true" className={styles.shadow} />
        <div className={styles.track}>
          {cards.map((card, position) => (
            <PlanStageCard
              card={card}
              key={card.seasonId}
              onPick={() => onSelect(position)}
              position={position}
              slot={slotOf(position, index, count)}
              total={count}
            />
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              aria-label="이전 재배 계획"
              className={`${styles.arrow} ${styles.arrowPrev}`}
              disabled={count === 2 && index === 0}
              onClick={() => onMove(-1)}
              type="button"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              aria-label="다음 재배 계획"
              className={`${styles.arrow} ${styles.arrowNext}`}
              disabled={count === 2 && index === count - 1}
              onClick={() => onMove(1)}
              type="button"
            >
              <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className={styles.dots}>
          {cards.map((card, position) => (
            <li key={card.seasonId}>
              <button
                aria-current={position === index}
                aria-label={`${card.name} 보기`}
                className={styles.dot}
                onClick={() => onSelect(position)}
                type="button"
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * 중앙(0)에서 몇 칸 떨어졌는지.
 * 계획이 3개 이상이면 앞뒤로 순환해서 중앙 양옆이 늘 차 있게 한다.
 * 두 칸을 넘어가면 화면에서 뺀다.
 */
function slotOf(position: number, index: number, count: number): string {
  let offset = position - index;
  if (count > 2) {
    const half = Math.floor(count / 2);
    offset = ((offset % count) + count + half) % count - half;
  }
  return Math.abs(offset) > 2 ? "hidden" : String(offset);
}

/* ------------------------------------------------------------ 카드 */

function PlanStageCard({
  card,
  onPick,
  position,
  slot,
  total,
}: {
  card: HomePlanCard;
  onPick: () => void;
  position: number;
  slot: string;
  total: number;
}) {
  const center = slot === "0";
  const crops = card.crops.slice(0, 3);

  return (
    <article
      aria-hidden={center ? undefined : true}
      aria-label={`${card.name} 재배 계획`}
      className={styles.card}
      data-slot={slot}
    >
      {!center && (
        <button
          aria-hidden="true"
          className={styles.pick}
          onClick={onPick}
          tabIndex={-1}
          type="button"
        >
          <span className="sr-only">{card.name} 카드 앞으로 가져오기</span>
        </button>
      )}

      <div className={styles.cardHead}>
        <span className={styles.place}>
          <i aria-hidden="true" />
          {card.spaceLabel || card.spaceName}
        </span>
        {card.overdueCount > 0 && (
          <span className={styles.alert} title={`기한 지난 일 ${card.overdueCount}개`}>
            <span aria-hidden="true">!</span>
            <span className="sr-only">기한 지난 일 {card.overdueCount}개</span>
          </span>
        )}
      </div>

      {crops.length > 0 ? (
        <ul className={styles.crops}>
          {crops.map((crop) => (
            <li className={styles.crop} key={crop.cropId}>
              <span className={styles.cropArt}>
                {crop.image
                  ? <Image alt="" fill sizes="88px" src={crop.image} />
                  : <span aria-hidden="true">{crop.name.slice(0, 1)}</span>}
              </span>
              <span className={styles.cropName}>{crop.name}</span>
              {crop.quantity !== null && (
                <span className={styles.cropQty}>{crop.quantity}포기</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.noCrops}>아직 배치한 작물이 없어요.</p>
      )}

      <h2 className={styles.planName}>{card.name}</h2>
      <p className={styles.planWhere}>{card.spaceName}</p>

      <div className={styles.facts}>
        <p className={styles.fact}>
          <span aria-hidden="true">날</span>
          <span>
            {card.growingDay === null
              ? <>시작 예정일 <b>{card.startDate}</b></>
              : <>재배 <b>{card.growingDay}</b>일째 · 진행률 <b>{card.progress}%</b></>}
          </span>
        </p>
        {card.nextTask && (
          <p className={`${styles.fact} ${card.nextTask.inDays < 0 ? styles.factWarn : ""}`}>
            <span aria-hidden="true">할</span>
            <span>
              {card.nextTask.title} · {formatDue(card.nextTask.inDays)}
            </span>
          </p>
        )}
      </div>

      {card.latestNote && (
        <div className={styles.note}>
          <span>{card.latestNote.occurredAt} 기록</span>
          <p>{card.latestNote.text}</p>
        </div>
      )}

      <Link className={styles.openPlan} href={`/seasons/${card.seasonId}/edit`} tabIndex={center ? undefined : -1}>
        재배 계획 정보
      </Link>

      <div className={styles.links}>
        <Link className={styles.link} href={card.placementHref} tabIndex={center ? undefined : -1}>작물 배치</Link>
        <Link className={styles.link} href={card.tasksHref} tabIndex={center ? undefined : -1}>재배 일정</Link>
        <Link className={styles.link} href={card.recordsHref} tabIndex={center ? undefined : -1}>재배 기록</Link>
      </div>

      <span className="sr-only">{total}개 중 {position + 1}번째</span>
    </article>
  );
}

/** 실제 기한 값만 사람 말로 바꾼다. 없는 상태는 만들지 않는다. */
function formatDue(inDays: number): string {
  if (inDays < 0) return `${Math.abs(inDays)}일 지남`;
  if (inDays === 0) return "오늘";
  if (inDays === 1) return "내일";
  return `${inDays}일 뒤`;
}

/* ------------------------------------------------------------ 보조 화면 */

function HomeEmpty() {
  return (
    <div className={styles.empty}>
      <p>키울 공간과 작물을 정하면 이 자리에 재배 카드가 생겨요.</p>
      <Link className={styles.emptyAction} href="/start">새 재배 시작</Link>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className={styles.stage}>
      <span aria-hidden="true" className={styles.light} />
      <p className={styles.state} role="status">재배 계획을 불러오고 있어요.</p>
    </div>
  );
}

function HomeLoadError({ detail }: { detail: string }) {
  return (
    <div className={styles.stage}>
      <span aria-hidden="true" className={styles.light} />
      <div className={styles.empty} role="alert">
        <h2>재배 정보를 불러오지 못했어요</h2>
        <p>연결이 잠시 불안정하거나 로그인 정보가 만료됐을 수 있어요.</p>
        <p className={styles.errorDetail}>확인 내용: {detail}</p>
        <button className={styles.emptyAction} onClick={() => window.location.reload()} type="button">
          다시 불러오기
        </button>
        <Link className={styles.errorLogin} href={`/login?next=${encodeNextPath("/dashboard")}`}>
          로그인 화면으로 이동
        </Link>
      </div>
    </div>
  );
}
