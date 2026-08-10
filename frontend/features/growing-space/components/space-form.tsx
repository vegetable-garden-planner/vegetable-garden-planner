"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  REGION_OPTIONS,
  SPACE_TYPE_OPTIONS,
  SUNLIGHT_OPTIONS,
} from "@/features/growing-space/data/space-options";
import {
  validateGrowingSpace,
  type GrowingSpace,
  type GrowingSpaceErrors,
  type GrowingSpaceFormValues,
} from "@/features/growing-space/domain/growing-space";
import {
  createGrowingSpaceOnServer,
  updateGrowingSpaceOnServer,
} from "@/features/growing-space/infrastructure/space-api";
import {
  isSunlightExposure,
  type GrowingSpaceType,
} from "@/shared/domain/growing-environment";

interface SpaceFormProps {
  initialType: GrowingSpaceType;
  space?: GrowingSpace;
}

export function SpaceForm({ initialType, space }: SpaceFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<GrowingSpaceFormValues>(() =>
    space ? toFormValues(space) : createEmptyValues(initialType),
  );
  const [errors, setErrors] = useState<GrowingSpaceErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof GrowingSpaceFormValues>(
    key: K,
    value: GrowingSpaceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const result = validateGrowingSpace(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);
    try {
      if (space) {
        await updateGrowingSpaceOnServer(space, result.value);
      } else {
        await createGrowingSpaceOnServer(result.value);
      }
      router.push("/spaces");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "공간을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateSunlight(value: string) {
    if (isSunlightExposure(value)) {
      update("sunlight", value);
    }
  }

  return (
    <form className="space-y-8" noValidate onSubmit={submit}>
      <fieldset>
        <legend className="text-lg font-bold">공간 유형</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {SPACE_TYPE_OPTIONS.map((option) => (
            <label className={`cursor-pointer rounded-2xl border p-4 ${values.type === option.value ? "border-leaf bg-leaf-soft/60" : "border-ink/10 bg-white"}`} key={option.value}>
              <input checked={values.type === option.value} className="accent-leaf" name="space-type" onChange={() => update("type", option.value)} type="radio" />
              <span className="ml-2 font-bold">{option.label}</span>
              <span className="mt-2 block text-sm leading-6 text-muted">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="공간 이름" error={errors.name} id="space-name">
        <input aria-describedby={errors.name ? "space-name-error" : undefined} aria-invalid={Boolean(errors.name)} aria-label="공간 이름" className="form-input" id="space-name" maxLength={30} onChange={(event) => update("name", event.target.value)} placeholder="예: 거실 창가, 우리집 베란다" value={values.name} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="가로 크기 (cm)" error={errors.widthCm} id="width">
          <input aria-describedby={errors.widthCm ? "width-error" : undefined} aria-invalid={Boolean(errors.widthCm)} aria-label="가로 크기 (cm)" className="form-input" id="width" inputMode="decimal" min="10" onChange={(event) => update("widthCm", event.target.value)} placeholder="예: 400" type="number" value={values.widthCm} />
        </Field>
        <Field label="세로 크기 (cm)" error={errors.lengthCm} id="length">
          <input aria-describedby={errors.lengthCm ? "length-error" : undefined} aria-invalid={Boolean(errors.lengthCm)} aria-label="세로 크기 (cm)" className="form-input" id="length" inputMode="decimal" min="10" onChange={(event) => update("lengthCm", event.target.value)} placeholder="예: 300" type="number" value={values.lengthCm} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="하루 일조 시간" id="sunlight">
          <select className="form-input" id="sunlight" onChange={(event) => updateSunlight(event.target.value)} value={values.sunlight}>
            {SUNLIGHT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="재배 지역" error={errors.region} id="region">
          <select aria-describedby={errors.region ? "region-error" : undefined} aria-invalid={Boolean(errors.region)} className="form-input" id="region" onChange={(event) => update("region", event.target.value)} value={values.region}>
            <option value="">지역 선택</option>
            {REGION_OPTIONS.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </Field>
      </div>

      <Field label="메모 (선택)" id="notes">
        <textarea aria-label="메모" className="form-input min-h-28 resize-y" id="notes" maxLength={300} onChange={(event) => update("notes", event.target.value)} placeholder="바람, 배수, 주변 환경 등을 기록해 보세요." value={values.notes} />
      </Field>

      {formError && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{formError}</p>}

      <button className="w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white hover:bg-leaf-dark disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "저장 중…" : space ? "변경 내용 저장" : "공간 등록하기"}</button>
    </form>
  );
}

function createEmptyValues(initialType: GrowingSpaceType): GrowingSpaceFormValues {
  return {
    name: "",
    type: initialType,
    sunlight: "partial",
    widthCm: "",
    lengthCm: "",
    region: "",
    notes: "",
  };
}

function toFormValues(space: GrowingSpace): GrowingSpaceFormValues {
  return {
    name: space.name,
    type: space.type,
    sunlight: space.sunlight,
    widthCm: String(space.widthCm),
    lengthCm: String(space.lengthCm),
    region: space.region,
    notes: space.notes,
  };
}

interface FieldProps {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}

function Field({ children, error, id, label }: FieldProps) {
  return (
    <div>
      <label className="mb-2 block font-bold" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-2 text-sm font-semibold text-red-700" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
