"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "@/app/home.module.css";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { CROP_REFERENCES } from "@/features/crop-catalog/data/crop-references";
import { useCultivationTasks } from "@/features/cultivation-schedule/hooks/use-cultivation-tasks";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import { createHomeDashboardModel } from "@/features/home/domain/home-dashboard";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("ko-KR", { weekday: "long" });
const KOREAN_DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" });

function Logo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <span className={styles.logoMark}><span /></span>
      <span>심어봄</span>
    </span>
  );
}

function Header({ authenticated }: { authenticated: boolean }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.logoLink} href="/" aria-label="심어봄 홈"><Logo /></Link>
        <nav className={styles.navigation} aria-label="주요 메뉴">
          <Link href="/start">심어봄 클래스</Link>
          <Link href="/crops">작물관리</Link>
          <Link href="/#today">가이드</Link>
          <Link href={authenticated ? "/dashboard" : "/login?next=%2Fdashboard"}>마이페이지</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.iconButton} href="/crops" aria-label="작물 검색"><span className={styles.searchIcon} aria-hidden="true" /></Link>
          <Link className={`${styles.iconButton} ${styles.bellButton}`} href={authenticated ? "/dashboard" : "/login?next=%2Fdashboard"} aria-label={authenticated ? "알림 확인" : "로그인"}>
            <span className={styles.bellIcon} aria-hidden="true" />
          </Link>
          <span className={styles.menuIcon} aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
    </header>
  );
}

export function HomeDashboard() {
  const auth = useAuthSession();
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const layoutsState = useGardenLayouts();
  const tasksState = useCultivationTasks();
  const now = new Date();
  const today = formatLocalDate(now);
  const authenticated = auth.status === "authenticated";
  const resourcesReady = spacesState.status === "ready"
    && seasonsState.status === "ready"
    && layoutsState.status === "ready"
    && tasksState.status === "ready";
  const model = resourcesReady
    ? createHomeDashboardModel(
        spacesState.spaces,
        seasonsState.seasons,
        layoutsState.layouts,
        tasksState.tasks,
        CROP_REFERENCES,
        today,
      )
    : createHomeDashboardModel([], [], [], [], CROP_REFERENCES, today);
  const dataError = authenticated
    ? [spacesState, seasonsState, layoutsState, tasksState]
        .find((state) => state.status === "error")
    : undefined;
  const resourcesLoading = authenticated && !resourcesReady && !dataError;
  const nickname = authenticated ? auth.session.user.nickname : "새싹";
  const primaryName = model.primaryCrop?.name ?? "첫 작물";
  const nextHref = model.primarySeason
    ? `/seasons/${model.primarySeason.id}/tasks`
    : model.primarySpace
      ? `/seasons/new?spaceId=${encodeURIComponent(model.primarySpace.id)}`
      : "/spaces/new";
  const harvestCopy = model.daysUntilHarvest === null
    ? model.primarySeason ? "다음 일정을" : "첫 공간을"
    : "수확까지";
  const harvestValue = model.daysUntilHarvest === null
    ? model.primarySeason ? "확인해 보세요" : "등록해 보세요"
    : `${model.daysUntilHarvest}일`;
  const displayedHarvestCopy = resourcesLoading
    ? "재배 현황을"
    : model.daysUntilHarvest !== null && model.daysUntilHarvest < 0
      ? "수확 예정일이"
      : model.daysUntilHarvest === 0
        ? "오늘은"
        : harvestCopy;
  const displayedHarvestValue = resourcesLoading
    ? "불러오고 있어요"
    : model.daysUntilHarvest !== null && model.daysUntilHarvest < 0
      ? `${Math.abs(model.daysUntilHarvest)}일 지났어요`
      : model.daysUntilHarvest === 0
        ? "수확 예정일이에요"
        : harvestValue;

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image className={styles.heroImage} src="/figma/image2.png" alt="햇살이 드는 온실 안의 작은 텃밭" fill priority sizes="100vw" />
        <div className={styles.heroShade} aria-hidden="true" />
        <Header authenticated={authenticated} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.greeting}>{getGreeting(now.getHours())}</p>
            <h1 id="hero-title">{authenticated ? <>오늘도<br />작은 텃밭은<br />자라고 있어요</> : <>나에게 맞는<br />작은 텃밭을<br />시작해 보세요</>}</h1>
            <p className={styles.heroDescription}>
              {authenticated
                ? resourcesLoading
                  ? <>{nickname}님의 재배 데이터를<br />불러오는 중이에요.</>
                  : <>{nickname}님이 키우는 작물 {model.cropCount}개가<br />서버에 안전하게 저장되어 있어요.</>
                : <>공간과 햇빛을 등록하면<br />나만의 재배 일정이 이어져요.</>}
            </p>
            {!authenticated && auth.status !== "loading" && <Link className={styles.heroAction} href="/signup?next=%2F">무료로 시작하기</Link>}
          </div>
          <div className={styles.dateCapsule} aria-label={`${formatKoreanDate(now)}, ${resourcesLoading ? "해야 할 일을 불러오는 중" : `오늘까지 해야 할 일 ${model.todayTaskCount}개`}`}>
            <span className={styles.capsuleLeaf} aria-hidden="true" />
            <span className={styles.todayLabel}>TODAY</span>
            <strong suppressHydrationWarning>{formatMonthDay(now)}</strong>
            <span className={styles.weekday} suppressHydrationWarning>{formatWeekday(now)}</span>
            <span className={styles.capsuleLine} aria-hidden="true" />
            <span className={styles.taskLabel}>해야 할 일</span>
            <b>{resourcesLoading ? "–" : model.todayTaskCount}</b>
            <a className={styles.downArrow} href="#garden-status" aria-label="작물 현황으로 이동">↓</a>
          </div>
        </div>
      </section>

      {dataError?.status === "error" && (
        <div className={styles.dataError} role="alert">{dataError.message}</div>
      )}

      <section id="garden-status" className={styles.statusSection} aria-label="현재 작물 현황">
        <div className={styles.statusGrid}>
          <article className={styles.cropCard}>
            <Image src="/figma/image3.png" alt="" fill sizes="(max-width: 768px) 100vw, 50vw" />
            <div className={styles.cropShade} aria-hidden="true" />
            <div className={styles.cropContent}>
              <span className={styles.photoBadge}>{resourcesLoading ? "불러오는 중" : model.primaryCrop ? "현재 키우는 작물" : "재배 시작 전"}</span>
              <h2>{resourcesLoading ? "재배 현황을 준비하고 있어요" : model.primaryCrop ? primaryName : "첫 작물을 등록해요"}</h2>
              <span className={styles.shortRule} aria-hidden="true" />
              <p><strong>{resourcesLoading ? "–" : model.growingDay}일째</strong><br />{resourcesLoading ? "저장된 시즌과 작물 정보를 확인하고 있어요" : model.primarySeason ? `${model.primarySeason.name} 일정을 따라 관리 중이에요` : "공간을 등록하면 재배 현황이 여기에 보여요"}</p>
              <div className={styles.progressMeta}><span>시즌 진행률</span><b>{resourcesLoading ? "계산 중" : `${model.progress}%`}</b></div>
              <div className={styles.progressTrack}><span style={{ width: `${model.progress}%` }} /></div>
            </div>
          </article>

          <article className={styles.nextStep}>
            <Image className={styles.leafDrawing} src="/figma/image9.png" alt="" width={1024} height={1536} aria-hidden="true" />
            <p className={styles.sectionLabel}>다음 단계</p>
            <h2>{displayedHarvestCopy}<br /><em>{displayedHarvestValue}</em></h2>
            <span className={styles.shortRule} aria-hidden="true" />
            <p className={styles.supportingCopy}>{resourcesLoading ? "서버에 저장된 재배 현황을\n안전하게 불러오고 있어요." : model.primarySeason ? "저장된 재배 일정에서\n다음 작업을 확인해 보세요." : "재배 공간과 시즌을 만들면\n맞춤 일정을 관리할 수 있어요."}</p>
            <span className={styles.nextBadge}>다음 할 일</span>
            <Link className={styles.inlineAction} href={resourcesLoading ? "/dashboard" : authenticated ? nextHref : "/login?next=%2Fdashboard"}><span>{resourcesLoading ? "내 홈 열기" : model.primarySeason ? "일정 확인하기" : "공간 등록하기"}</span><b aria-hidden="true">→</b></Link>
          </article>
        </div>
      </section>

      <section id="today" className={styles.todaySection} aria-labelledby="today-title">
        <div className={styles.todayGrid}>
          <div className={styles.taskPanel}>
            <p className={styles.greenLabel}>오늘의 할 일</p>
            <h2 id="today-title">오늘은<br />{resourcesLoading ? "일정을 불러오고 있어요" : model.tasks.length > 0 ? `${model.tasks.length}가지만 해보세요` : "한숨 돌려도 좋아요"}</h2>
            <ol className={styles.taskList}>
              {model.tasks.length > 0 ? model.tasks.map((task, index) => (
                <li key={task.id}>
                  <span className={styles.taskIcon} aria-hidden="true">{task.icon}</span>
                  <span className={styles.taskNumber}>{index + 1}</span>
                  <span className={styles.taskCopy}><Link href={task.href}><strong>{task.title}</strong><small>{task.description}</small></Link></span>
                  <span className={styles.rowArrow} aria-hidden="true">→</span>
                </li>
              )) : (
                <li>
                  <span className={styles.taskIcon} aria-hidden="true">✓</span>
                  <span className={styles.taskNumber}>0</span>
                  <span className={styles.taskCopy}><strong>{resourcesLoading ? "저장된 일정을 확인하고 있어요" : "예정된 작업이 없어요"}</strong><small>{resourcesLoading ? "잠시만 기다려 주세요." : authenticated ? "새 일정이 생기면 이곳에 바로 표시됩니다." : "로그인하면 나의 재배 일정을 확인할 수 있어요."}</small></span>
                  <span className={styles.rowArrow} aria-hidden="true">·</span>
                </li>
              )}
            </ol>
          </div>
          <div className={styles.balconyImage}><Image src="/figma/image4.png" alt="햇빛이 드는 베란다의 작은 텃밭" fill sizes="(max-width: 768px) 100vw, 50vw" /></div>
        </div>
      </section>

      <section className={styles.growthSection} aria-label="재배 기간 기록">
        <div className={styles.growthCard}>
          <div className={styles.dayCount}><strong>{resourcesLoading ? "–" : model.growingDay}</strong><span>일</span></div>
          <div className={styles.seedling}><Image src="/figma/image8.png" alt="흙에서 돋아난 새싹" fill sizes="160px" /></div>
          <div className={styles.growthCopy}><h2>{resourcesLoading ? <>재배 기록을<br />불러오고 있어요</> : model.primarySeason ? <>{model.primarySeason.name}<br />기록이 쌓이고 있어요</> : <>작은 화분부터<br />재배 기록을 시작해요</>}</h2><p>{resourcesLoading ? "계정에 저장된 시즌과 일정을 확인하고 있습니다." : model.primarySpace ? `${model.primarySpace.name}의 변화와 일정을 한곳에서 관리합니다.` : "공간과 시즌을 등록하면 날짜와 진행률을 자동으로 계산합니다."}</p></div>
        </div>
      </section>

      <section id="recommend" className={styles.recommendSection} aria-labelledby="recommend-title">
        <div className={styles.recommendBackdrop}>
          <Image src="/figma/image1.png" alt="싱그러운 바질 잎" fill sizes="(max-width: 1160px) 100vw, 1160px" />
          <div className={styles.recommendShade} aria-hidden="true" />
          <div className={styles.recommendContent}>
            <p>이번 주 추천</p>
            <h2 id="recommend-title">다음엔<br />뭘 심어볼까요?</h2>
            <p className={styles.recommendIntro}>{model.primarySpace ? `${model.primarySpace.name} 환경에서 키울 수 있고\n아직 배치하지 않은 작물이에요.` : "공간을 등록하기 전 둘러보기 좋은\n초보자용 작물이에요."}</p>
            <div className={styles.recommendations}>
              {model.recommendations.map((item) => (
                <Link className={styles.recommendCard} href={item.href} key={item.id}>
                  <span className={styles.recommendImage}><Image src={item.image} alt="" fill sizes="96px" /></span>
                  <span className={styles.recommendCopy}><strong>{item.name}</strong><small>{item.description}</small></span>
                  <span className={styles.recommendArrow} aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <Link className={styles.scrollPrompt} href={authenticated ? "/dashboard" : "/signup?next=%2Fdashboard"}><span aria-hidden="true">↓</span> {authenticated ? "내 홈에서 전체 재배 현황을 확인해 보세요" : "가입하고 나만의 재배 기록을 시작해 보세요"}</Link>
      </section>

      <footer className={styles.footer}><div><Logo /><p>작은 화분을 만드는 가장 쉬운 시작</p></div></footer>
    </main>
  );
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthDay(date: Date) {
  return MONTH_DAY_FORMATTER.format(date).replace(/\.\s?/g, ".").replace(/\.$/, "");
}

function formatWeekday(date: Date) {
  return WEEKDAY_FORMATTER.format(date);
}

function formatKoreanDate(date: Date) {
  return KOREAN_DATE_FORMATTER.format(date);
}

function getGreeting(hour: number) {
  if (hour < 11) return "좋은 아침이에요";
  if (hour < 18) return "싱그러운 오후예요";
  return "오늘도 수고했어요";
}
