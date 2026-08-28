"use client";

import Link from "next/link";
import { SeasonForm } from "@/features/growing-season/components/season-form";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import styles from "@/features/growing-season/components/growing-season.module.css";

export function SeasonEditor({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();

  if (seasonsState.status === "loading") {
    return <p className="surface-panel p-5 text-muted" role="status">재배 계획 정보를 불러오고 있습니다.</p>;
  }

  if (seasonsState.status === "error") {
    return <Message message={seasonsState.message} />;
  }

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) {
    return <Message message="수정할 재배 계획을 찾을 수 없습니다." />;
  }

  return <SeasonForm initialSpaceId={season.spaceId} season={season} />;
}

function Message({ message }: { message: string }) {
  return (
    <div className={styles.errorMessage} role="alert">
      <p>{message}</p>
      <Link href="/seasons">내 재배 계획으로 돌아가기 →</Link>
    </div>
  );
}
