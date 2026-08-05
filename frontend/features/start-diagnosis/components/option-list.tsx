import type { DiagnosisOption } from "@/features/start-diagnosis/data/questions";

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
    <fieldset className="grid gap-3">
      <legend className="sr-only">답변 선택</legend>
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <label
            className={`flex cursor-pointer gap-4 rounded-2xl border p-4 transition sm:p-5 ${
              isSelected
                ? "border-leaf bg-leaf-soft/60 ring-2 ring-leaf/10"
                : "border-ink/10 bg-white hover:border-leaf/35"
            }`}
            key={option.value}
          >
            <input
              checked={isSelected}
              className="mt-1 size-4 accent-leaf"
              name={name}
              onChange={() => onSelect(option.value)}
              type="radio"
              value={option.value}
            />
            <span>
              <span className="block font-bold text-ink">{option.label}</span>
              <span className="mt-1 block text-sm leading-6 text-muted">{option.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
