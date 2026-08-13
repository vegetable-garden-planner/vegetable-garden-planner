"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SunlightLocationAssistant } from "@/features/growing-space/components/sunlight-location-assistant";
import {
  SPACE_SIZE_PRESETS,
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
  createGrowingSpace,
  updateGrowingSpace,
} from "@/features/growing-space/infrastructure/space-api";
import {
  isSunlightExposure,
  type GrowingSpaceType,
} from "@/shared/domain/growing-environment";
import { ApiError } from "@/shared/infrastructure/api-client";

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

    try {
      if (space) await updateGrowingSpace(space, result.value);
      else await createGrowingSpace(result.value);
      router.push("/spaces");
    } catch (error) {
      const serverErrors = toSpaceServerErrors(error);
      setErrors(serverErrors.fields);
      setFormError(serverErrors.form);
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
        <input aria-describedby={errors.name ? "space-name-error" : undefined} aria-invalid={Boolean(errors.name)} className="form-input" id="space-name" maxLength={30} onChange={(event) => update("name", event.target.value)} placeholder="예: 거실 창가, 우리집 베란다" value={values.name} />
      </Field>

      <fieldset>
        <legend className="text-lg font-bold">공간 크기</legend>
        <p className="mt-1 text-sm leading-6 text-muted">정확히 재지 않아도 됩니다. 가장 비슷한 크기를 고른 뒤 필요하면 숫자만 조절하세요.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {SPACE_SIZE_PRESETS.map((preset) => {
            const selected = values.widthCm === String(preset.widthCm) && values.lengthCm === String(preset.lengthCm);
            return (
              <button className={`rounded-2xl border p-4 text-left ${selected ? "border-leaf bg-leaf-soft/60" : "border-ink/10 bg-white"}`} key={preset.label} onClick={() => {
                update("widthCm", String(preset.widthCm));
                update("lengthCm", String(preset.lengthCm));
              }} type="button">
                <strong className="block">{preset.label}</strong>
                <span className="mt-1 block text-sm text-muted">{preset.widthCm} × {preset.lengthCm}cm · {preset.description}</span>
              </button>
            );
          })}
        </div>
        <details className="mt-3 rounded-2xl border border-ink/10 bg-white p-4 text-sm leading-6">
          <summary className="cursor-pointer font-bold">줄자 없이 대략 재는 방법</summary>
          <p className="mt-2 text-muted">A4 용지는 약 21 × 30cm, 스마트폰 긴 쪽은 약 15cm입니다. A4 용지나 스마트폰을 몇 번 놓을 수 있는지 세면 충분합니다. 바닥 타일 한 장 크기를 알고 있다면 타일 개수로 계산해도 됩니다.</p>
        </details>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="가로 크기 (cm)" error={errors.widthCm} id="width">
          <input aria-describedby={errors.widthCm ? "width-error" : undefined} aria-invalid={Boolean(errors.widthCm)} className="form-input" id="width" inputMode="decimal" min="10" onChange={(event) => update("widthCm", event.target.value)} placeholder="예: 400" type="number" value={values.widthCm} />
        </Field>
        <Field label="세로 크기 (cm)" error={errors.lengthCm} id="length">
          <input aria-describedby={errors.lengthCm ? "length-error" : undefined} aria-invalid={Boolean(errors.lengthCm)} className="form-input" id="length" inputMode="decimal" min="10" onChange={(event) => update("lengthCm", event.target.value)} placeholder="예: 300" type="number" value={values.lengthCm} />
        </Field>
      </div>

      <div>
        <Field label="하루 일조 시간" id="sunlight">
          <select className="form-input" id="sunlight" onChange={(event) => updateSunlight(event.target.value)} value={values.sunlight}>
            {SUNLIGHT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      </div>

      <SunlightLocationAssistant
        onApply={(location, sunlight) => {
          setValues((current) => ({ ...current, ...location, sunlight }));
          setErrors((current) => ({ ...current, latitude: undefined, longitude: undefined }));
        }}
        value={{
          address: values.address,
          estimatedSunlightHours: values.estimatedSunlightHours,
          latitude: values.latitude,
          longitude: values.longitude,
          orientation: values.orientation,
        }}
      />

      <Field label="메모 (선택)" id="notes">
        <textarea className="form-input min-h-28 resize-y" id="notes" maxLength={300} onChange={(event) => update("notes", event.target.value)} placeholder="바람, 배수, 주변 환경 등을 기록해 보세요." value={values.notes} />
      </Field>

      {formError && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{formError}</p>}

      <button className="w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white hover:bg-leaf-dark" type="submit">{space ? "변경 내용 저장" : "공간 등록하기"}</button>
    </form>
  );
}

function toSpaceServerErrors(error: unknown): {
  fields: GrowingSpaceErrors;
  form: string;
} {
  if (!(error instanceof ApiError)) {
    return { fields: {}, form: "공간을 저장하지 못했습니다." };
  }

  if (error.fields.region) {
    return {
      fields: {},
      form: "공간 등록 기능을 업데이트하고 있습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const fields: GrowingSpaceErrors = {
    name: error.fields.name?.[0],
    widthCm: error.fields.widthCm?.[0],
    lengthCm: error.fields.lengthCm?.[0],
    address: error.fields.address?.[0],
    latitude: error.fields.latitude?.[0],
    longitude: error.fields.longitude?.[0],
    orientation: error.fields.orientation?.[0],
    estimatedSunlightHours: error.fields.estimatedSunlightHours?.[0],
    notes: error.fields.notes?.[0],
  };
  const hasVisibleFieldError = Object.values(fields).some(Boolean);

  return {
    fields,
    form: hasVisibleFieldError ? "표시된 입력값을 확인해 주세요." : error.message,
  };
}

function createEmptyValues(initialType: GrowingSpaceType): GrowingSpaceFormValues {
  return {
    name: "",
    type: initialType,
    sunlight: "partial",
    widthCm: "",
    lengthCm: "",
    address: "",
    latitude: "",
    longitude: "",
    orientation: null,
    estimatedSunlightHours: null,
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
    address: space.address ?? "",
    latitude: space.latitude === null ? "" : String(space.latitude),
    longitude: space.longitude === null ? "" : String(space.longitude),
    orientation: space.orientation,
    estimatedSunlightHours: space.estimatedSunlightHours,
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
