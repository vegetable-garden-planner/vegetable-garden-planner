import styles from "./diagnosis-form.module.css";

export type SunlightDuration = "2h" | "3-5h" | "6h+";
export type PlantPlacement = "balcony" | "window" | "indoor";

export interface SunlightSelection {
  duration?: SunlightDuration;
  placement?: PlantPlacement;
}

const DURATION_OPTIONS: readonly { value: SunlightDuration; label: string }[] = [
  { value: "2h", label: "2H" },
  { value: "3-5h", label: "3-5H" },
  { value: "6h+", label: "6H+" },
];

const PLACEMENT_OPTIONS: readonly { value: PlantPlacement; label: string }[] = [
  { value: "balcony", label: "베란다" },
  { value: "window", label: "창가" },
  { value: "indoor", label: "실내" },
];

export function SunlightStage({
  onAdvance,
  onBack,
  onDurationChange,
  onPlacementChange,
  selection,
}: {
  onAdvance: () => void;
  onBack: () => void;
  onDurationChange: (value: SunlightDuration) => void;
  onPlacementChange: (value: PlantPlacement) => void;
  selection: SunlightSelection;
}) {
  const complete = Boolean(selection.duration && selection.placement);

  return (
    <div className={styles.sunlightStage}>
      <svg
        aria-hidden="true"
        className={styles.sunlightCurve}
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 1440 800"
      >
        <path d="M0 0H1440V92C1288 2 1074 -6 834 23C532 59 228 126 0 177Z" fill="#f5f1e8" />
        <path
          d="M0 177C228 126 532 59 834 23C1074 -6 1288 2 1440 92"
          fill="none"
          stroke="#00a9ff"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div aria-hidden="true" className={styles.sunlightCanopy}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <div aria-label="진행률 2/3" className={styles.sunlightProgress}>
        <p><strong>02</strong><span> / 03</span></p>
        <i aria-hidden="true" />
      </div>

      <div className={styles.sunlightContent}>
        <header className={styles.sunlightHeading}>
          <h1>이 공간의 햇빛 조건을 알려주세요</h1>
          <p>햇빛이 들어오는 시간과 위치에 따라 심어봄이 더 잘 자라는 식물을 추천해드려요.</p>
        </header>

        <SunlightChoiceGroup
          label="하루 평균 햇빛 지속 시간"
          name="sunlight-duration"
          onChange={onDurationChange}
          options={DURATION_OPTIONS}
          selected={selection.duration}
          variant="duration"
        />
        <SunlightChoiceGroup
          label="주로 두는 위치"
          name="plant-placement"
          onChange={onPlacementChange}
          options={PLACEMENT_OPTIONS}
          selected={selection.placement}
          variant="placement"
        />

        <div className={styles.sunlightNavigation}>
          <button className={styles.sunlightBack} onClick={onBack} type="button">
            <span aria-hidden="true">←</span> 이전
          </button>
          <button className={styles.sunlightNext} disabled={!complete} onClick={onAdvance} type="button">
            다음 <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SunlightChoiceGroup<T extends string>({
  label,
  name,
  onChange,
  options,
  selected,
  variant,
}: {
  label: string;
  name: string;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  selected?: T;
  variant: "duration" | "placement";
}) {
  return (
    <fieldset className={styles.sunlightGroup}>
      <legend>{label}</legend>
      <div className={styles.sunlightOptions} data-variant={variant}>
        {options.map((option) => (
          <label className={styles.sunlightChoice} key={option.value}>
            <input
              checked={selected === option.value}
              name={name}
              onChange={() => onChange(option.value)}
              onKeyDown={(event) => {
                if (event.key !== " " && event.key !== "Enter") return;
                event.preventDefault();
                onChange(option.value);
              }}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
