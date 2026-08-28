import Link from "next/link";
import { CropArtwork } from "@/features/crop-catalog/components/crop-artwork";
import {
  CROP_CATEGORY_LABELS,
  CROP_DIFFICULTY_LABELS,
  GROWING_SPACE_LABELS,
  PLANTING_MATERIAL_LABELS,
} from "@/features/crop-catalog/data/crop-labels";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import styles from "./crop-catalog.module.css";

export function CropCard({ crop }: { crop: CropReference }) {
  return (
    <li>
      <Link aria-label={`${crop.name} 상세 정보 보기`} className={styles.card} href={`/crops/${crop.id}`}>
        <CropArtwork crop={crop} />
        <div className={styles.cardBody}>
          <div className={styles.cardHeading}>
            <div>
              <p>{CROP_CATEGORY_LABELS[crop.category]} · {crop.familyName}</p>
              <h3>{crop.name}</h3>
            </div>
            <span>{CROP_DIFFICULTY_LABELS[crop.difficulty]}</span>
          </div>
          <p className={styles.summary}>{crop.summary}</p>
          <dl className={styles.cardFacts}>
            <Fact label="시작" value={crop.plantingPeriod.label} />
            <Fact label="수확·감상" value={crop.harvestPeriod.label} />
            <Fact label="시작 형태" value={PLANTING_MATERIAL_LABELS[crop.plantingMaterial]} />
            <Fact label="간격" value={`${crop.plantSpacingCm}cm`} />
          </dl>
          <div className={styles.cardFooter}>
            <div>{crop.supportedSpaces.map((space) => <span key={space}>{GROWING_SPACE_LABELS[space]}</span>)}</div>
            <strong>가이드 보기 <span aria-hidden="true">→</span></strong>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
