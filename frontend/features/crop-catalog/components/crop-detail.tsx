import { SessionAwareLink } from "@/components/session-aware-link";
import { CropArtwork } from "@/features/crop-catalog/components/crop-artwork";
import {
  CROP_CATEGORY_LABELS,
  CROP_DIFFICULTY_LABELS,
  GROWING_SPACE_LABELS,
  PLANTING_MATERIAL_LABELS,
} from "@/features/crop-catalog/data/crop-labels";
import type { CropReference, CropSource } from "@/features/crop-catalog/domain/crop-reference";
import styles from "./crop-detail.module.css";

export function CropDetail({ crop, source }: { crop: CropReference; source?: CropSource }) {
  const startPath = `/seasons/new?cropId=${encodeURIComponent(crop.id)}`;
  const startLabel = crop.plantingMaterial === "cut-flower" ? "꽃 관리 시작하기" : `${crop.name} 키우기 시작`;

  return (
    <div className={styles.detail}>
      <section className={styles.overview} aria-labelledby="crop-overview-title">
        <CropArtwork crop={crop} priority variant="hero" />
        <div className={styles.overviewCopy}>
          <div className={styles.identity}>
            <div><p>{CROP_CATEGORY_LABELS[crop.category]} · {crop.familyName}</p><h2 id="crop-overview-title">{crop.name} 재배 핵심</h2></div>
            <span>{CROP_DIFFICULTY_LABELS[crop.difficulty]}</span>
          </div>
          <p className={styles.overviewSummary}>{crop.summary}</p>
          <dl className={styles.overviewFacts}>
            <Fact label="시작 형태" value={PLANTING_MATERIAL_LABELS[crop.plantingMaterial]} />
            <Fact label="시작 시기" value={crop.plantingPeriod.label} />
            <Fact label="수확·감상" value={crop.harvestPeriod.label} />
            <Fact label="권장 간격" value={`${crop.plantSpacingCm}cm`} />
          </dl>
          <div className={styles.spaceTags} aria-label="지원 재배 공간">
            {crop.supportedSpaces.map((space) => <span key={space}>{GROWING_SPACE_LABELS[space]}</span>)}
          </div>
        </div>
      </section>

      <div className={styles.workspace}>
        <div className={styles.mainColumn}>
          <GrowingSteps crop={crop} />
          {crop.careGuide && <CareGuide crop={crop} />}
        </div>
        <aside className={styles.sideColumn}>
          <StartCard crop={crop} startLabel={startLabel} startPath={startPath} />
          {source && <SourceCard source={source} />}
        </aside>
      </div>
    </div>
  );
}

function GrowingSteps({ crop }: { crop: CropReference }) {
  return (
    <section className={styles.steps} aria-labelledby="growing-steps-title">
      <div className={styles.sectionHeading}><p>재배 계획 요약</p><h2 id="growing-steps-title">시작부터 수확까지</h2><span>품종과 실제 환경에 따라 시기는 달라질 수 있어요.</span></div>
      <ol>
        <Step index={1} title="준비와 시작" description={`${crop.plantingPeriod.label}에 ${PLANTING_MATERIAL_LABELS[crop.plantingMaterial]} 형태로 시작해요.`} />
        <Step index={2} title="공간 확보" description={`포기 사이 ${crop.plantSpacingCm}cm를 기준으로 통풍과 성장 공간을 확보해요.`} />
        <Step index={3} title="수확과 감상" description={`${crop.harvestPeriod.label}을 기준으로 상태를 살펴 수확하거나 감상해요.`} />
      </ol>
    </section>
  );
}

function Step({ description, index, title }: { description: string; index: number; title: string }) {
  return <li><span>{index}</span><div><h3>{title}</h3><p>{description}</p></div></li>;
}

function CareGuide({ crop }: { crop: CropReference }) {
  const guide = crop.careGuide;
  if (!guide) return null;

  return (
    <section className={styles.care} aria-labelledby="care-guide-title">
      <div className={styles.sectionHeading}><p>오래 건강하게 돌보기</p><h2 id="care-guide-title">첫날부터 이렇게 관리하세요</h2><span>꽃과 실내 식물은 자리와 물 관리가 가장 중요해요.</span></div>
      <dl><CareFact label="함께할 수 있는 기간" value={guide.lifespan} /><CareFact label="빛" value={guide.light} /><CareFact label="물" value={guide.watering} /><CareFact label="온도와 자리" value={guide.temperature} /></dl>
      <ol>{guide.actions.map((action, index) => <li key={action}><span>{index + 1}</span><p>{action}</p></li>)}</ol>
    </section>
  );
}

function CareFact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function StartCard({ crop, startLabel, startPath }: { crop: CropReference; startLabel: string; startPath: string }) {
  return (
    <section className={styles.startCard} aria-labelledby="crop-start-title">
      <p>내 재배 계획에 담기</p><h2 id="crop-start-title">{crop.name} 재배를 시작해 볼까요?</h2>
      <span>공간과 기간을 정하면 일정과 기록을 한곳에서 이어갈 수 있습니다.</span>
      <SessionAwareLink anonymousHref={`/login?next=${encodeURIComponent(startPath)}`} anonymousLabel={startLabel} authenticatedHref={startPath} authenticatedLabel={startLabel} className={styles.startAction} />
      <small>선택한 작물을 키울 수 있는 공간만 시즌 생성 화면에 표시됩니다.</small>
    </section>
  );
}

function SourceCard({ source }: { source: CropSource }) {
  return (
    <section className={styles.sourceCard} aria-labelledby="crop-source-title">
      <p>정보 출처</p><h2 id="crop-source-title">공식 자료를 확인했어요</h2>
      <dl><div><dt>기관</dt><dd>{source.organization}</dd></div><div><dt>최종 검토</dt><dd>{source.reviewedAt}</dd></div></dl>
      <a href={source.url} rel="noreferrer" target="_blank">{source.title} <span aria-hidden="true">↗</span></a>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
