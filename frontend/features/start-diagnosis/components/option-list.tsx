import type { DiagnosisOption } from "@/features/start-diagnosis/data/questions";
import styles from "./start-diagnosis.module.css";

interface OptionListProps<T extends string> {
  name: string;
  options: readonly DiagnosisOption<T>[];
  selected?: T;
  onSelect: (value: T) => void;
}

export function OptionList<T extends string>({
  name,
  options,
  selected,
  onSelect,
}: OptionListProps<T>) {
  return (
    <fieldset className={styles.options}>
      <legend>답변 선택</legend>
      {options.map((option) => (
        <label className={styles.option} key={option.value}>
          <input
            checked={selected === option.value}
            name={name}
            onChange={() => onSelect(option.value)}
            type="radio"
            value={option.value}
          />
          <span>
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
