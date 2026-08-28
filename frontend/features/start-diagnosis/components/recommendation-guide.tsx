"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { SessionAwareLink } from "@/components/session-aware-link";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { CROP_RULES } from "../data/crop-rules";
import type { CropId } from "../data/crop-selection";
import type { GardenConfiguration } from "../domain/garden-configuration";
import type { GardenRecommendation } from "../domain/garden-recommendation";
import {
  Recommendation3DCanvas,
  RecommendationPlanterView,
} from "./recommendation-garden-viewport";
import styles from "./recommendation-guide.module.css";

export function RecommendationGuide({
  configuration,
  recommendation,
}: {
  configuration: GardenConfiguration;
  recommendation: GardenRecommendation;
}) {
  return (
    <div
      className={styles.stage}
      data-planter-count={recommendation.planters.length}
      data-recommendation-source="planter-and-sunlight-only"
    >
      <div aria-label="진행률 3/3" className={styles.progress}>
        <p><strong>03</strong><span> / 03</span></p>
        <i aria-hidden="true"><b /></i>
      </div>

      <main className={styles.content}>
        <header className={styles.heading}>
          <h1>이렇게 심어보세요</h1>
          <p>입력한 화분과 햇빛 조건에 맞춰 첫 재배 계획을 만들었어요.</p>
        </header>

        <section
          aria-label={`${recommendation.planters.length}개 화분의 추천 식재 구성`}
          className={styles.planterGrid}
          data-count={recommendation.planters.length}
        >
          {recommendation.planters.map((planter, index) => {
            const seedlingCount = planter.crops.reduce((total, crop) => total + crop.seedlingCount, 0);
            const cropCallouts = createCropCallouts(
              planter.crops,
              recommendation.planters.length,
            );
            return (
              <article
                className={styles.planterCard}
                data-crop-instance-count={seedlingCount}
                data-planter-id={planter.id}
                data-soil-fill-height-cm={planter.soilFillHeightCm}
                key={planter.id}
              >
                <header className={styles.cardHeading}>
                  <h2>{planter.label}</h2>
                  {planter.crops.map((crop) => (
                    <p key={crop.cropId}>{CROP_RULES[crop.cropId].name} {crop.seedlingCount}포기</p>
                  ))}
                </header>

                <div
                  aria-label={`${planter.label}, ${planter.crops.map((crop) => `${CROP_RULES[crop.cropId].name} ${crop.seedlingCount}포기`).join(", ")}`}
                  className={styles.planterVisual}
                  data-camera-controls="none"
                  data-guide-planter-visual-size="60x25x20"
                  data-model-source="existing-blender-glb"
                  role="img"
                >
                  <RecommendationPlanterView
                    className={styles.view}
                    configuration={configuration}
                    index={index}
                    planter={planter}
                    totalSeedlings={recommendation.totalSeedlings}
                  />
                  <div aria-hidden="true" className={styles.badges}>
                    {cropCallouts.map((crop) => (
                      <span
                        className={styles.cropCallout}
                        key={crop.cropId}
                        style={{
                          "--callout-top": `${crop.topRem}rem`,
                          "--callout-x": `${crop.badgeXPercent}%`,
                          "--leader-direction": crop.leaderDirection,
                          "--leader-height": `${crop.leaderHeightRem}rem`,
                          "--leader-width": `${crop.leaderWidthRem}rem`,
                        } as CSSProperties}
                      >
                        <span className={styles.cropBadge}>
                          <span aria-hidden="true" className={styles.badgeThumbnail}>
                            {CROP_RULES[crop.cropId].name.slice(0, 1)}
                          </span>
                          <span className={styles.badgeName}>{CROP_RULES[crop.cropId].name}</span>
                          <b>{crop.seedlingCount}개</b>
                        </span>
                        <span className={styles.calloutLeader}>
                          <i />
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section aria-label="추천 준비물 합계" className={styles.summaryBar}>
          <div>
            <span className={styles.summaryImage}>
              <Image
                alt=""
                fill
                sizes="30px"
                src="/figma/summary-soil-mark-v2.png"
              />
            </span>
            <p>필요한 흙 <strong>약 {formatNumber(recommendation.totalSoilLiters)}L</strong></p>
          </div>
          <i aria-hidden="true" />
          <div>
            <span className={styles.summaryImage}>
              <Image alt="" fill sizes="30px" src="/figma/summary-seedling-mark-v2.png" />
            </span>
            <p>모종 <strong>{recommendation.totalSeedlings}개</strong></p>
          </div>
        </section>

        {recommendation.unplacedCrops.length > 0 && (
          <aside className={styles.unplaced}>
            <p className={styles.unplacedTitle}>이번 구성에 넣지 못한 작물</p>
            <ul>
              {recommendation.unplacedCrops.map((crop) => (
                <li key={crop.cropId}>
                  <strong>{CROP_RULES[crop.cropId].name}</strong>
                  <span>{crop.reason}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {recommendation.warnings.length > 0 && (
          <aside className={styles.warnings}>
            {recommendation.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </aside>
        )}

        <div className={styles.actions}>
          <a
            className={styles.reselectButton}
            href="/start?stage=crops"
          >
            <span aria-hidden="true">←</span> 다시 선택
          </a>
          <SessionAwareLink
            anonymousHref={`/login?next=${encodeNextPath("/start")}`}
            anonymousLabel={<>로그인하고 배치 확인하기 <span aria-hidden="true">→</span></>}
            authenticatedHref="/start/plan"
            authenticatedLabel={<>배치 확인하기 <span aria-hidden="true">→</span></>}
            className={styles.homeButton}
          />
        </div>
      </main>

      <Recommendation3DCanvas className={styles.canvasLayer} />
    </div>
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const CALLOUT_LAYOUT: Readonly<Record<CropId, {
  leaderHeightRem: number;
  topRem: number;
}>> = {
  lettuce: { leaderHeightRem: 2.8, topRem: 5.3 },
  spinach: { leaderHeightRem: 2.85, topRem: 5.25 },
  "young-radish": { leaderHeightRem: 2.7, topRem: 5.1 },
  "green-onion": { leaderHeightRem: 2.2, topRem: 4.2 },
  carrot: { leaderHeightRem: 2.6, topRem: 5 },
  tomato: { leaderHeightRem: 0.85, topRem: 0.55 },
};

function createCropCallouts(
  crops: GardenRecommendation["planters"][number]["crops"],
  planterCount: number,
) {
  const totalWidth = Math.max(
    crops.reduce((total, crop) => total + crop.allocatedWidthCm, 0),
    1,
  );
  let allocatedWidth = 0;

  return crops.map((crop, index) => {
    const center = allocatedWidth + crop.allocatedWidthCm / 2;
    allocatedWidth += crop.allocatedWidthCm;
    const targetXPercent = Math.min(78, Math.max(22, center / totalWidth * 100));
    const horizontalOffset = crops.length === 1 ? -6 : index === 0 ? -6 : 6;
    const badgeXPercent = Math.min(82, Math.max(18, targetXPercent + horizontalOffset));
    const horizontalDistance = Math.abs(targetXPercent - badgeXPercent);
    const remPerPercent = planterCount === 1 ? 0.36 : 0.26;
    const layout = CALLOUT_LAYOUT[crop.cropId];

    return {
      ...crop,
      badgeXPercent,
      leaderDirection: targetXPercent >= badgeXPercent ? 1 : -1,
      leaderHeightRem: layout.leaderHeightRem,
      leaderWidthRem: Math.max(1, horizontalDistance * remPerPercent),
      topRem: layout.topRem,
    };
  });
}
