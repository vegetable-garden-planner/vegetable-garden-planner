"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import styles from "./season-tabs.module.css";

/**
 * 재배 계획 내부 탭
 *
 * 계획 하위 화면(배치·일정·물주기·기록·수정)에 공통으로 얹는다.
 * 각 화면의 내용과 기능은 건드리지 않고, 그 위에 이동 경로만 더한다.
 *
 * 계획 이름과 공간 이름은 이미 받아 둔 캐시에서 읽으므로 추가 요청이 없다.
 */

type SeasonSection = "placement" | "tasks" | "watering" | "records" | "edit";

export function SeasonTabs({ seasonId }: { seasonId: string }) {
  const pathname = usePathname();
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();

  const season = seasonsState.status === "ready"
    ? seasonsState.seasons.find((item) => item.id === seasonId)
    : undefined;
  const space = season && spacesState.status === "ready"
    ? spacesState.spaces.find((item) => item.id === season.spaceId)
    : undefined;

  // 텃밭은 격자에서, 화분·베란다는 화분 배치에서 작물을 놓는다.
  const placementHref = space?.type === "garden"
    ? `/seasons/${seasonId}/layout`
    : `/seasons/${seasonId}/placements`;

  const current = getCurrentSection(pathname);

  return (
    <nav aria-label="재배 계획 메뉴" className={styles.wrap}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>내 재배 계획</p>
        <h2 className={styles.name}>{season?.name ?? "재배 계획"}</h2>
        {space && (
          <span className={styles.space}>
            {space.name} · {GROWING_SPACE_LABELS[space.type]}
          </span>
        )}
      </div>

      <ul className={styles.tabs}>
        <Tab current={current === "placement"} href={placementHref} label="작물 배치" />
        <Tab current={current === "tasks"} href={`/seasons/${seasonId}/tasks`} label="재배 일정" />
        <Tab current={current === "watering"} href={`/seasons/${seasonId}/watering`} label="물주기" />
        <Tab current={current === "records"} href={`/seasons/${seasonId}/records`} label="재배 기록" />
        <Tab current={current === "edit"} href={`/seasons/${seasonId}/edit`} label="계획 수정" minor />
      </ul>
    </nav>
  );
}

function Tab({
  current,
  href,
  label,
  minor = false,
}: {
  current: boolean;
  href: string;
  label: string;
  minor?: boolean;
}) {
  return (
    <li>
      <Link
        aria-current={current ? "page" : undefined}
        className={`${styles.tab} ${minor ? styles.minor : ""}`}
        href={href}
      >
        {label}
      </Link>
    </li>
  );
}

function getCurrentSection(pathname: string): SeasonSection | null {
  if (pathname.endsWith("/placements") || pathname.endsWith("/layout")) return "placement";
  if (pathname.endsWith("/tasks")) return "tasks";
  if (pathname.endsWith("/watering")) return "watering";
  if (pathname.endsWith("/records")) return "records";
  if (pathname.endsWith("/edit")) return "edit";
  return null;
}
