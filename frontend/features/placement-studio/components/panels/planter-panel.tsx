"use client";

import { useState } from "react";
import type { SunlightExposure } from "@/shared/domain/growing-environment";
import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { SUN_LABELS } from "@/features/placement-studio/domain/validation";
import styles from "../placement-studio.module.css";

const SUN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "모름" },
  { value: "full", label: `햇빛 잘 듦 (${SUN_LABELS.full})` },
  { value: "partial", label: `반나절 (${SUN_LABELS.partial})` },
  { value: "low", label: `그늘 (${SUN_LABELS.low})` },
];

const TYPE_OPTIONS = [
  { value: "balcony", label: "베란다" },
  { value: "indoor", label: "실내" },
] as const;

/** 화분 추가. 실제 /spaces API 로 바로 만들어진다. */
export function PlanterPanel({ studio }: { studio: StudioController }) {
  const [name, setName] = useState("새 화분");
  const [width, setWidth] = useState("60");
  const [length, setLength] = useState("30");
  const [depth, setDepth] = useState("20");
  const [sun, setSun] = useState("");
  const [type, setType] = useState<"balcony" | "indoor">("balcony");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await studio.actions.addPlanter({
        name,
        widthCm: Number(width) || 60,
        lengthCm: Number(length) || 30,
        depthCm: depth === "" ? null : Number(depth),
        address: "",
        sunlight: (sun || null) as SunlightExposure | null,
        type,
      }, studio.targetPlanId);
      studio.notify("화분을 추가했습니다.");
      setName("새 화분");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "화분을 추가하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className={styles.panelTitle}>화분</h2>
      <div className={styles.muted}>
        화분은 실제 등록 크기 그대로 캔버스에 그려집니다. 캔버스에서 화분을 늘리거나 줄이지 않고,
        여기와 오른쪽 정보 창에서 실제 크기를 입력해 바꿉니다.
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.sectionTitle}>새 화분 추가</div>
      <div className={styles.label}>화분 이름</div>
      <input className={styles.field} onChange={(event) => setName(event.target.value)} value={name} />

      <div className={styles.label}>가로 × 세로 × 깊이 (cm)</div>
      <div className={styles.row3}>
        <input aria-label="가로" className={styles.field} inputMode="numeric" onChange={(event) => setWidth(event.target.value)} value={width} />
        <span>×</span>
        <input aria-label="세로" className={styles.field} inputMode="numeric" onChange={(event) => setLength(event.target.value)} value={length} />
        <span>×</span>
        <input aria-label="깊이" className={styles.field} inputMode="numeric" onChange={(event) => setDepth(event.target.value)} value={depth} />
        <span>cm</span>
      </div>

      <div className={styles.label}>종류</div>
      <select className={styles.field} onChange={(event) => setType(event.target.value as "balcony" | "indoor")} value={type}>
        {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      <div className={styles.label}>햇빛</div>
      <select className={styles.field} onChange={(event) => setSun(event.target.value)} value={sun}>
        {SUN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      <button className={styles.full} disabled={busy} onClick={() => void add()} type="button">
        {busy ? "추가하는 중…" : "＋ 화분 추가"}
      </button>

      <PlanPlanters studio={studio} />
    </>
  );
}

/**
 * 이 재배 계획의 화분 목록
 *
 * 배치 편집기의 기준 단위는 화분 하나가 아니라 재배 계획 하나다.
 * 여기서 계획에 화분을 올리고 내리면 같은 캔버스에 함께 나타난다.
 */
function planName(studio: StudioController): string {
  return studio.context?.plans.find((plan) => plan.id === studio.targetPlanId)?.name ?? "재배 계획";
}

function PlanPlanters({ studio }: { studio: StudioController }) {
  const inPlan = studio.state.planters;
  const others = studio.otherSpaces;

  return (
    <>
      <div className={styles.planterList}>
        <div className={`${styles.sectionTitle} ${styles.sectionTitleFlat}`}>
          캔버스의 화분 ({inPlan.length})
        </div>
        {inPlan.map((planter) => (
          <div className={styles.planterRowSplit} key={planter.id}>
            <button
              className={styles.planterRowMain}
              onClick={() => {
                studio.select("planter", planter.id);
                studio.view.focus(planter);
                studio.setSheet(null);
              }}
              type="button"
            >
              <strong>{planter.name}</strong>
              <small>
                {planter.seasonName} · {planter.w}×{planter.h}
                {planter.d === null ? "" : `×${planter.d}`}cm
              </small>
            </button>
            <button
              className={styles.rowAction}
              onClick={() => {
                const message = studio.actions.detachPlanter(planter.id);
                studio.notify(message ?? "이 계획의 캔버스에서 내렸습니다. 화분 자체는 그대로 있습니다.");
              }}
              title="이 계획에서 내리기"
              type="button"
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>
        {planName(studio)}에 화분 더 올리기
      </div>
      {others.length === 0 && (
        <div className={styles.muted}>올릴 수 있는 다른 화분이 없습니다.</div>
      )}
      {others.map((space) => (
        <div className={styles.planterRowSplit} key={space.id}>
          <div className={styles.planterRowMain}>
            <strong>{space.name}</strong>
            <small>
              {space.widthCm}×{space.lengthCm}{space.depthCm === null ? "" : `×${space.depthCm}`}cm
            </small>
          </div>
          <button
            className={`${styles.rowAction} ${styles.rowActionAdd}`}
            onClick={() => {
              studio.actions.attachPlanter(space.id, studio.targetPlanId);
              studio.notify(`${space.name}을(를) 이 계획의 캔버스에 올렸습니다.`);
            }}
            title="이 계획에 올리기"
            type="button"
          >
            ＋
          </button>
        </div>
      ))}

      <div className={styles.groupMemberHint}>
캔버스는 재배 계획 하나가 아니라 재배 공간 전체를 담습니다. 화분은 각자 자기 계획을 그대로 유지합니다.
        작물을 한 포기라도 놓고 저장하면 그 화분은 서버에도 그 계획의 화분으로 남습니다.
        아직 비어 있는 화분은 이 기기에서만 캔버스에 올라가 있습니다.
      </div>
    </>
  );
}
