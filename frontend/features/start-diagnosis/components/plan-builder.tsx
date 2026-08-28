"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { putContainerPlacements } from "@/features/container-placement/infrastructure/container-placement-api";
import { fetchContainerPlacements } from "@/features/container-placement/infrastructure/container-placement-api";
import { createGrowingSeason } from "@/features/growing-season/infrastructure/season-api";
import { createGrowingSpace } from "@/features/growing-space/infrastructure/space-api";
import {
  clearStoredGardenConfiguration,
  GARDEN_CONFIGURATOR_STORAGE_KEY,
  toGardenConfiguration,
  type GardenConfiguratorState,
} from "@/features/start-diagnosis/domain/garden-configuration";
import type { GardenRecommendation } from "@/features/start-diagnosis/domain/garden-recommendation";
import { createPlanDraft, toPlacementInputs } from "@/features/start-diagnosis/domain/plan-draft";
import { invalidateResource } from "@/shared/infrastructure/resource-cache";
import styles from "./plan-builder.module.css";

/**
 * 진단 결과를 실제 계정에 저장하는 단계
 *
 * 화분 개수만큼 공간을 만들고 → 재배 계획 하나를 만들고 → 추천 배치를 저장한 뒤
 * 배치 확인 화면으로 보낸다. 새 백엔드 API는 쓰지 않고 기존 것만 순서대로 부른다.
 */

type Phase = "idle" | "spaces" | "season" | "placements" | "done" | "error";

const PHASE_LABELS: Record<Exclude<Phase, "idle" | "error">, string> = {
  spaces: "화분을 준비하고 있어요",
  season: "재배 기간을 잡고 있어요",
  placements: "추천 배치를 옮기고 있어요",
  done: "준비 끝",
};

export function PlanBuilder() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const stored = readStored();
      if (!stored) {
        setPhase("error");
        setMessage("진단 결과를 찾을 수 없어요. 처음부터 다시 진행해 주세요.");
        return;
      }

      const { configuration, recommendation } = stored;
      const draft = createPlanDraft(configuration, recommendation, formatToday());

      try {
        setPhase("spaces");
        const spaceIds: string[] = [];
        for (const input of draft.spaces) {
          const space = await createGrowingSpace(input);
          spaceIds.push(space.id);
        }

        setPhase("season");
        const season = await createGrowingSeason({ ...draft.season, spaceId: spaceIds[0] });

        setPhase("placements");
        const placements = toPlacementInputs(draft, spaceIds);
        if (placements.length > 0) {
          // 방금 만든 계획이라 버전은 서버가 준 값을 그대로 쓴다.
          const current = await fetchContainerPlacements(season.id);
          await putContainerPlacements(season.id, current.version, placements);
          invalidateResource(`container-placements:${season.id}`);
          invalidateResource("container-placements");
        }

        clearStoredGardenConfiguration();
        setPhase("done");
        router.replace(`/seasons/${season.id}/placements?from=start`);
      } catch (error) {
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "추천 배치를 준비하지 못했어요.");
      }
    })();
  }, [router]);

  if (phase === "error") {
    return (
      <div className={styles.panel} role="alert">
        <p className={styles.kicker}>다시 시도해 주세요</p>
        <h1 className={styles.title}>배치를 준비하지 못했어요</h1>
        <p className={styles.lead}>{message}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/start">진단 다시 하기</Link>
          <Link className={styles.secondary} href="/dashboard">홈으로</Link>
        </div>
      </div>
    );
  }

  const active: Exclude<Phase, "idle" | "error"> = phase === "idle" ? "spaces" : phase;

  return (
    <div aria-live="polite" className={styles.panel}>
      <p className={styles.kicker}>거의 다 됐어요</p>
      <h1 className={styles.title}>추천 배치를 준비하고 있어요</h1>
      <p className={styles.lead}>다음 화면에서 작물과 포기 수를 바꿀 수 있어요.</p>

      <ol className={styles.steps}>
        {(Object.keys(PHASE_LABELS) as (keyof typeof PHASE_LABELS)[]).map((key) => {
          const order = ["spaces", "season", "placements", "done"];
          const state = order.indexOf(key) < order.indexOf(active)
            ? "done"
            : key === active ? "current" : "waiting";
          return (
            <li className={styles.step} data-state={state} key={key}>
              <span aria-hidden="true" className={styles.dot}>{state === "done" ? "✓" : ""}</span>
              <span>{PHASE_LABELS[key]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function readStored(): {
  configuration: Parameters<typeof createPlanDraft>[0];
  recommendation: GardenRecommendation;
} | null {
  try {
    const raw = window.sessionStorage.getItem(GARDEN_CONFIGURATOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      configuration?: GardenConfiguratorState;
      recommendation?: GardenRecommendation | null;
    };
    if (!parsed.configuration || !parsed.recommendation?.planters?.length) return null;
    const configuration = toGardenConfiguration(parsed.configuration);
    if (!configuration) return null;
    return { configuration, recommendation: parsed.recommendation };
  } catch {
    return null;
  }
}

function formatToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
