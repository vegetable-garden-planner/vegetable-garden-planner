"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SunlightLocationAssistant } from "@/features/growing-space/components/sunlight-location-assistant";
import {
  SHADE_OPTIONS,
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
  clearStoredGardenConfiguration,
  readStoredGardenConfiguration,
} from "@/features/start-diagnosis/domain/garden-configuration";
import {
  isSpaceShade,
  isSunlightExposure,
  type GrowingSpaceType,
  type SunlightExposure,
} from "@/shared/domain/growing-environment";
import { ApiError } from "@/shared/infrastructure/api-client";
import styles from "@/features/growing-space/components/growing-space.module.css";

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
  const [diagnosisApplied, setDiagnosisApplied] = useState(false);

  useEffect(() => {
    if (space) return;
    const frame = window.requestAnimationFrame(() => {
      const diagnosis = readStoredGardenConfiguration();
      if (!diagnosis) return;
      setValues((current) => ({
        ...current,
        type: diagnosisSpaceType(diagnosis.sunlight.location),
        sunlight: diagnosisSunlightExposure(diagnosis.sunlight.duration),
        widthCm: String(diagnosis.planter.widthCm),
        lengthCm: String(diagnosis.planter.heightCm),
        depthCm: String(diagnosis.planter.depthCm),
      }));
      setDiagnosisApplied(true);
      clearStoredGardenConfiguration();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [space]);

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

  return (
    <form className={styles.formLayout} noValidate onSubmit={submit}>
      <div className={styles.formMain}>
      {diagnosisApplied && (
        <p className={styles.diagnosisNotice} role="status">
          방금 진단한 화분 크기와 햇빛 조건을 아래에 미리 채워 넣었어요. 내용을 확인하고 이름을 정한 뒤 저장해 주세요.
        </p>
      )}
      <fieldset className={styles.formSection}>
        <legend><span>01</span><strong>공간 유형</strong></legend>
        <p className={styles.sectionDescription}>실제 재배 방식과 가장 가까운 환경을 선택해 주세요.</p>
        <div className={styles.optionGrid}>
          {SPACE_TYPE_OPTIONS.map((option) => (
            <label className={`${styles.optionCard} ${values.type === option.value ? styles.optionCardSelected : ""}`} key={option.value}>
              <input checked={values.type === option.value} name="space-type" onChange={() => update("type", option.value)} type="radio" />
              <span className={styles.optionIndex}>{option.value === "indoor" ? "A" : option.value === "balcony" ? "B" : "C"}</span>
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}><span>02</span><div><h2>이름과 크기</h2><p>목록에서 바로 알아볼 수 있는 이름과 실제 사용할 면적을 적어주세요.</p></div></div>
        <Field label="공간 이름" error={errors.name} id="space-name">
          <input aria-describedby={errors.name ? "space-name-error" : undefined} aria-invalid={Boolean(errors.name)} className={styles.input} id="space-name" maxLength={30} onChange={(event) => update("name", event.target.value)} placeholder="예: 거실 창가, 우리집 베란다" value={values.name} />
        </Field>

        <fieldset className={styles.sizeFieldset}>
        <legend>빠른 크기 선택</legend>
        <p>정확히 재지 않아도 됩니다. 가장 비슷한 크기를 고른 뒤 숫자를 조절하세요.</p>
        <div className={styles.presetGrid}>
          {SPACE_SIZE_PRESETS.map((preset) => {
            const selected = values.widthCm === String(preset.widthCm) && values.lengthCm === String(preset.lengthCm);
            return (
              <button className={`${styles.presetButton} ${selected ? styles.presetButtonSelected : ""}`} key={preset.label} onClick={() => {
                update("widthCm", String(preset.widthCm));
                update("lengthCm", String(preset.lengthCm));
              }} type="button">
                <strong>{preset.label}</strong>
                <span>{preset.widthCm} × {preset.lengthCm}cm</span>
                <small>{preset.description}</small>
              </button>
            );
          })}
        </div>
        <details className={styles.measureGuide}>
          <summary>줄자 없이 대략 재는 방법</summary>
          <p>A4 용지는 약 21 × 30cm, 스마트폰 긴 쪽은 약 15cm입니다. A4 용지나 스마트폰을 몇 번 놓을 수 있는지 세면 충분합니다. 바닥 타일 한 장 크기를 알고 있다면 타일 개수로 계산해도 됩니다.</p>
        </details>
      </fieldset>

      <div className={styles.fieldGrid}>
        <Field label="가로 크기 (cm)" error={errors.widthCm} id="width">
          <input aria-describedby={errors.widthCm ? "width-error" : undefined} aria-invalid={Boolean(errors.widthCm)} className={styles.input} id="width" inputMode="decimal" min="10" onChange={(event) => update("widthCm", event.target.value)} placeholder="예: 400" type="number" value={values.widthCm} />
        </Field>
        <Field label="세로 크기 (cm)" error={errors.lengthCm} id="length">
          <input aria-describedby={errors.lengthCm ? "length-error" : undefined} aria-invalid={Boolean(errors.lengthCm)} className={styles.input} id="length" inputMode="decimal" min="10" onChange={(event) => update("lengthCm", event.target.value)} placeholder="예: 300" type="number" value={values.lengthCm} />
        </Field>
        <Field label="깊이 (cm, 선택)" error={errors.depthCm} id="depth">
          <input aria-describedby={errors.depthCm ? "depth-error" : undefined} aria-invalid={Boolean(errors.depthCm)} className={styles.input} id="depth" inputMode="decimal" min="1" onChange={(event) => update("depthCm", event.target.value)} placeholder="예: 20" type="number" value={values.depthCm} />
        </Field>
      </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}><span>03</span><div><h2>햇빛과 위치</h2><p>직접 선택하거나 주소·현재 위치로 예상 일조 시간을 계산할 수 있어요.</p></div></div>
        <Field label="하루 일조 시간" id="sunlight">
          <select className={styles.input} id="sunlight" onChange={(event) => update("sunlight", isSunlightExposure(event.target.value) ? event.target.value : null)} value={values.sunlight ?? ""}>
            {SUNLIGHT_OPTIONS.map((option) => <option key={option.label} value={option.value ?? ""}>{option.label}</option>)}
          </select>
        </Field>

        <Field label="주변 가림 정도" id="shade">
          <select className={styles.input} id="shade" onChange={(event) => update("shadeLevel", isSpaceShade(event.target.value) ? event.target.value : null)} value={values.shadeLevel ?? ""}>
            {SHADE_OPTIONS.map((option) => <option key={option.label} value={option.value ?? ""}>{option.label}</option>)}
          </select>
        </Field>

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
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}><span>04</span><div><h2>환경 메모</h2><p>배수, 바람, 그늘처럼 다음 작물 선택에 참고할 내용을 남겨두세요.</p></div></div>
        <Field label="메모 (선택)" id="notes">
          <textarea className={`${styles.input} ${styles.textarea}`} id="notes" maxLength={300} onChange={(event) => update("notes", event.target.value)} placeholder="바람, 배수, 주변 환경 등을 기록해 보세요." value={values.notes} />
        </Field>
      </section>

      {formError && <p className={styles.errorMessage} role="alert">{formError}</p>}

      <button className={styles.submitButton} type="submit">{space ? "변경 내용 저장" : "공간 등록하기"} <span>→</span></button>
      </div>

      <aside className={styles.formAside} aria-label="입력 중인 공간 요약">
        <p>등록 미리보기</p>
        <h2>{values.name.trim() || "공간 이름을 입력해 주세요"}</h2>
        <span>{SPACE_TYPE_OPTIONS.find((option) => option.value === values.type)?.label}</span>
        <dl>
          <div><dt>크기</dt><dd>{values.widthCm && values.lengthCm ? `${values.widthCm} × ${values.lengthCm}${values.depthCm ? ` × ${values.depthCm}` : ""}cm` : "입력 전"}</dd></div>
          <div><dt>햇빛</dt><dd>{values.estimatedSunlightHours === null ? SUNLIGHT_OPTIONS.find((option) => option.value === values.sunlight)?.label : `하루 약 ${values.estimatedSunlightHours}시간`}</dd></div>
          <div><dt>위치</dt><dd>{values.address || "선택 사항"}</dd></div>
        </dl>
        <div className={styles.asideGuide}>
          <strong>등록 후 다음 단계</strong>
          <p>공간에 맞는 시즌을 만들고, 화분·베란다는 화분마다 작물과 수량을 배치합니다. 마당·텃밭은 격자에 작물을 배치해요.</p>
        </div>
      </aside>
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
    depthCm: error.fields.depthCm?.[0],
    address: error.fields.address?.[0],
    latitude: error.fields.latitude?.[0],
    longitude: error.fields.longitude?.[0],
    orientation: error.fields.orientation?.[0],
    shadeLevel: error.fields.shadeLevel?.[0],
    estimatedSunlightHours: error.fields.estimatedSunlightHours?.[0],
    notes: error.fields.notes?.[0],
  };
  const hasVisibleFieldError = Object.values(fields).some(Boolean);

  return {
    fields,
    form: hasVisibleFieldError ? "표시된 입력값을 확인해 주세요." : error.message,
  };
}

function diagnosisSpaceType(location: "balcony" | "window" | "indoor"): GrowingSpaceType {
  if (location === "balcony") return "balcony";
  return "indoor";
}

function diagnosisSunlightExposure(duration: "2h" | "3-5h" | "6h+"): SunlightExposure {
  if (duration === "2h") return "low";
  if (duration === "6h+") return "full";
  return "partial";
}

function createEmptyValues(initialType: GrowingSpaceType): GrowingSpaceFormValues {
  return {
    name: "",
    type: initialType,
    sunlight: "partial",
    widthCm: "",
    lengthCm: "",
    depthCm: "",
    address: "",
    latitude: "",
    longitude: "",
    orientation: null,
    shadeLevel: null,
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
    depthCm: space.depthCm === null ? "" : String(space.depthCm),
    address: space.address ?? "",
    latitude: space.latitude === null ? "" : String(space.latitude),
    longitude: space.longitude === null ? "" : String(space.longitude),
    orientation: space.orientation,
    shadeLevel: space.shadeLevel,
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
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p id={`${id}-error`}>{error}</p>}
    </div>
  );
}
