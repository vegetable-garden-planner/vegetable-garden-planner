"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/brand-mark";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import styles from "./app-sidebar.module.css";

/**
 * 전역 사이드바
 *
 * 목적은 "이 서비스에 어떤 기능이 있는지" 를 메뉴 한 번으로 보여주는 것이다.
 * 그래서 주요 기능을 접지 않고 모두 펼쳐 둔다.
 *
 * 작물 배치 / 재배 일정 / 재배 기록은 seasonId가 있어야 열 수 있다.
 * 새 선택 화면을 만들지 않고 이렇게 푼다.
 *   재배 계획 0개 → /seasons (비어 있으면 만들기 안내가 이미 있다)
 *   재배 계획 1개 → 그 계획의 화면으로 바로
 *   재배 계획 2개+ → /seasons (카드마다 배치·일정·물주기·기록 링크가 이미 있다)
 *
 * 열린 패널은 반드시 document.body 로 포털해서 그린다.
 *
 * 이유: 이 컴포넌트의 여는 버튼은 <header class="app-header"> 안에 있는데,
 * 그 헤더에 backdrop-filter: blur(18px) 이 걸려 있다. CSS 규격상
 * backdrop-filter 가 none 이 아니면 그 요소가 position:fixed 자손의
 * "포함 블록"이 된다. 그래서 패널의 inset:0 이 뷰포트가 아니라
 * 헤더(높이 약 77px)를 기준으로 잡혀 메뉴가 잘려 보였다.
 *
 * /dashboard 만 멀쩡했던 것은 그 화면이 variant="overlay" 를 써서
 * .app-header-overlay { backdrop-filter: none } 이 적용됐기 때문이다.
 *
 * 포털로 body 바로 아래에 그리면 헤더의 backdrop-filter 든, 다른 화면의
 * transform·contain·overflow:hidden 이든 영향을 받지 않는다.
 */

const PLACEMENT_MARK = "배";
const SCHEDULE_MARK = "일";
const RECORD_MARK = "기";

export function AppSidebar({ variant = "default" }: { variant?: "default" | "overlay" }) {
  const pathname = usePathname();
  const panelId = useId();

  // 어느 화면에서 열었는지를 기억한다.
  // 화면이 바뀌면 값이 어긋나면서 저절로 닫히므로, 닫으려고 따로 상태를 맞출 필요가 없다.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  const setOpen = useCallback(
    (next: boolean) => setOpenedOn(next ? pathname : null),
    [pathname],
  );

  // 열려 있는 동안 Esc로 닫고, 뒤 배경 스크롤을 멈춘다.
  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, setOpen]);

  return (
    <>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label="메뉴 열기"
        className={`${styles.trigger} ${variant === "overlay" ? styles.triggerOverlay : ""}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span aria-hidden="true" className={styles.bars}><i /><i /><i /></span>
      </button>

      {open && createPortal(
        <>
          <button
            aria-label="메뉴 닫기"
            className={styles.scrim}
            onClick={() => setOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <SidebarPanel id={panelId} onClose={() => setOpen(false)} pathname={pathname} />
        </>,
        document.body,
      )}
    </>
  );
}

function SidebarPanel({
  id,
  onClose,
  pathname,
}: {
  id: string;
  onClose: () => void;
  pathname: string;
}) {
  const auth = useAuthSession();
  const authenticated = auth.state.status === "authenticated";

  return (
    <div aria-label="주요 메뉴" className={styles.panel} id={id} role="dialog">
      <div className={styles.panelHead}>
        <span className={styles.panelBrand}>
          <BrandMark size={22} variant="color" />
          <span>심어봄</span>
        </span>
        <button aria-label="메뉴 닫기" className={styles.close} onClick={onClose} type="button">
          ✕
        </button>
      </div>

      <nav className={styles.body}>
        {authenticated ? (
          <AuthenticatedMenu pathname={pathname} />
        ) : (
          <GuestMenu pathname={pathname} />
        )}
      </nav>

      <p className={styles.foot}>작은 화분을 만드는 가장 쉬운 시작</p>
    </div>
  );
}

/* ------------------------------------------------------------------ 로그인 */

function AuthenticatedMenu({ pathname }: { pathname: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();

  const seasons = seasonsState.status === "ready" ? seasonsState.seasons : [];
  const spaces = spacesState.status === "ready" ? spacesState.spaces : [];
  const loading = seasonsState.status === "loading";

  // 진행 중인 계획을 우선으로, 없으면 첫 계획을 기준으로 삼는다.
  const focusSeason = seasons.find((season) => season.status === "active") ?? seasons[0];
  const many = seasons.length > 1;

  // 배치 화면은 공간 종류에 따라 갈린다. (텃밭=격자 / 화분·베란다=화분 배치)
  const focusSpaceType = focusSeason
    ? spaces.find((space) => space.id === focusSeason.spaceId)?.type
    : undefined;
  const placementHref = !focusSeason || many
    ? "/seasons"
    : focusSpaceType === "garden"
      ? `/seasons/${focusSeason.id}/layout`
      : `/seasons/${focusSeason.id}/placements`;
  const scheduleHref = !focusSeason || many ? "/seasons" : `/seasons/${focusSeason.id}/tasks`;
  const recordHref = !focusSeason || many ? "/seasons" : `/seasons/${focusSeason.id}/records`;

  const planNote = loading
    ? "불러오는 중"
    : many
      ? "계획 고르기"
      : focusSeason
        ? focusSeason.name
        : "계획 먼저 만들기";

  return (
    <>
      <ul className={styles.group}>
        <MenuItem active={pathname === "/dashboard"} href="/dashboard" mark="홈" label="홈" />
        <MenuItem active={pathname === "/mypage"} href="/mypage" mark="마" label="마이페이지" />
      </ul>

      <p className={styles.groupLabel}>내 재배</p>
      <ul className={styles.group}>
        <MenuItem
          active={pathname.startsWith("/seasons") && !isSeasonChild(pathname)}
          href="/seasons"
          label="내 재배 계획"
          mark="계"
          note={loading ? undefined : `${seasons.length}개`}
        />
        <MenuItem
          active={pathname.startsWith("/spaces")}
          href="/spaces"
          label="화분/공간"
          mark="화"
          note={spacesState.status === "ready" ? `${spaces.length}개` : undefined}
        />
        <MenuItem
          active={isSeasonSection(pathname, "placements") || isSeasonSection(pathname, "layout")}
          href={placementHref}
          label="작물 배치"
          mark={PLACEMENT_MARK}
          note={planNote}
        />
        <MenuItem
          active={isSeasonSection(pathname, "tasks") || isSeasonSection(pathname, "watering")}
          href={scheduleHref}
          label="재배 일정"
          mark={SCHEDULE_MARK}
          note={planNote}
        />
        <MenuItem
          active={isSeasonSection(pathname, "records")}
          href={recordHref}
          label="재배 기록"
          mark={RECORD_MARK}
          note={planNote}
        />
      </ul>

      <p className={styles.groupLabel}>둘러보기</p>
      <ul className={styles.group}>
        <MenuItem active={pathname.startsWith("/crops")} href="/crops" label="작물 도감" mark="도" />
        <li>
          <Link className={styles.minor} href="/plans">요금제 안내</Link>
        </li>
      </ul>
    </>
  );
}

/* ---------------------------------------------------------------- 비로그인 */

function GuestMenu({ pathname }: { pathname: string }) {
  return (
    <>
      <p className={styles.groupLabel}>시작하기</p>
      <ul className={styles.group}>
        <MenuItem active={pathname === "/"} href="/" label="심어봄 소개" mark="심" />
        <MenuItem active={pathname.startsWith("/start")} href="/start" label="맞춤 진단 받기" mark="진" />
        <MenuItem active={pathname.startsWith("/crops")} href="/crops" label="작물 도감" mark="도" />
      </ul>

      <p className={styles.groupLabel}>계정</p>
      <ul className={styles.group}>
        <MenuItem active={pathname.startsWith("/login")} href="/login" label="로그인" mark="로" />
        <MenuItem active={pathname.startsWith("/signup")} href="/signup" label="회원가입" mark="가" />
        <li>
          <Link className={styles.minor} href="/plans">요금제 안내</Link>
        </li>
      </ul>
    </>
  );
}

/* -------------------------------------------------------------------- 조각 */

function MenuItem({
  active,
  href,
  label,
  mark,
  note,
}: {
  active: boolean;
  href: string;
  label: string;
  mark: string;
  note?: string;
}) {
  return (
    <li>
      <Link aria-current={active ? "page" : undefined} className={styles.item} href={href}>
        <span aria-hidden="true" className={styles.mark}>{mark}</span>
        <span>{label}</span>
        {note && <span className={styles.itemNote}>{note}</span>}
      </Link>
    </li>
  );
}

/** /seasons/<id>/<section> 형태인지 확인한다. */
function isSeasonSection(pathname: string, section: string): boolean {
  return /^\/seasons\/[^/]+\/[^/]+$/.test(pathname) && pathname.endsWith(`/${section}`);
}

/** /seasons/<id>/... 처럼 계획 내부 화면인지 확인한다. (/seasons, /seasons/new 는 제외) */
function isSeasonChild(pathname: string): boolean {
  return /^\/seasons\/[^/]+\/.+$/.test(pathname);
}
