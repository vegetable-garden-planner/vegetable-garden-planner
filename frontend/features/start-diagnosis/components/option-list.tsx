import Image from "next/image";
import type { DiagnosisOption } from "@/features/start-diagnosis/data/questions";
import styles from "./diagnosis-form.module.css";

interface OptionListProps<T extends string> {
  name: string;
  options: readonly DiagnosisOption<T>[];
  selected?: T;
  onSelect: (value: T) => void;
  imageByValue?: Partial<Record<T, string>>;
}

export function OptionList<T extends string>({
  name,
  options,
  selected,
  onSelect,
  imageByValue,
}: OptionListProps<T>) {
  return (
    <fieldset className={styles.optionGrid}>
      <legend className="sr-only">답변 선택</legend>
      {options.map((option) => {
        const isSelected = selected === option.value;
        const imageSource = imageByValue?.[option.value];

        return (
          <label className={`${styles.optionCard} ${isSelected ? styles.optionSelected : ""}`} key={option.value}>
            <input
              checked={isSelected}
              className={styles.optionInput}
              name={name}
              onChange={() => onSelect(option.value)}
              type="radio"
              value={option.value}
            />
            {imageSource && (
              <span className={styles.optionImage}>
                <Image alt="" fill sizes="128px" src={imageSource} />
              </span>
            )}
            <span className={styles.optionCopy}>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            <span className={styles.optionCheck} aria-hidden="true">{isSelected ? "✓" : ""}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
