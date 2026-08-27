"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CROP_REFERENCES } from "@/features/crop-catalog/data/crop-references";
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
import { createGrowingSeason } from "@/features/growing-season/infrastructure/season-api";
import { putContainerPlacements } from "@/features/container-placement/infrastructure/container-placement-api";
import type { ContainerPlacementInput } from "@/features/container-placement/domain/container-placement";
import type { CropId } from "@/features/start-diagnosis/data/crop-selection";
import {
  clearStoredGardenConfiguration,
  readStoredGardenConfiguration,
  type GardenConfiguration,
} from "@/features/start-diagnosis/domain/garden-configuration";
import { createGardenRecommendation } from "@/features/start-diagnosis/domain/garden-recommendation";
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
  skipDiagnosis?: boolean;
  space?: GrowingSpace;
}

type AutoCreateMode = "loading" | "form" | "error" | "empty";

const SEASON_DURATION_DAYS = 90;

// 진단 작물 id -> 실제 작물 도감 id. basil·strawberry는 대응하는 실제 작물이
// 없어 매핑하지 않고, 배치 생성 시 조용히 제외한다.
const DIAGNOSIS_CROP_TO_CATALOG_ID: Partial<Record<CropId, string>> = {
  lettuce: "lettuce",
  spinach: "spinach",
  "cherry-tomato": "tomato",
  chili: "pepper",
};

/**
 * 세션에 남아 있는 진단 결과를 읽어 공간·시즌·화분 배치를 자동으로 만든다.
 * skipAutoCreate가 true면(수정 화면이거나 사용자가 직접 입력을 선택한 경우)
 * 아무 것도 하지 않고 빈 폼을 그대로 보여준다.
 */
function useDiagnosisAutoCreate(skipAutoCreate: boolean) {
  const router = useRouter();
  const [diagnosis] = useState<GardenConfiguration | null>(() =>
    skipAutoCreate ? null : readStoredGardenConfiguration(),
  );
  const [mode, setMode] = useState<AutoCreateMode>(diagnosis ? "loading" : "form");
  const [autoCreateError, setAutoCreateError] = useState("");
  const [emptySeasonId, setEmptySeasonId] = useState("");
  const progressRef = useRef<{ space?: GrowingSpace; seasonId?: string; seasonVersion?: number }>({});
  const isRunningRef = useRef(false);

  function handleSuccess({ placementCount, seasonId }: { placementCount: number; seasonId: string }) {
    clearStoredGardenConfiguration();
    // 추천 작물이 실제 도감과 매칭되지 않아(예: 바질·딸기만 고른 경우) 화분이
    // 빈 채로 만들어졌으면, 이유도 모른 채 빈 배치 화면으로 넘어가지 않도록 알려준다.
    if (placementCount === 0) {
      setEmptySeasonId(seasonId);
      setMode("empty");
      return;
    }
    router.push(`/seasons/${seasonId}/placements`);
  }

  function handleFailure(error: unknown) {
    setAutoCreateError(
      error instanceof ApiError ? error.message : "텃밭을 만드는 중 문제가 발생했습니다.",
    );
    setMode("error");
  }

  // effect 안에서 setState를 부르는 함수를 직접 호출하면 렌더링 경고가 발생하므로,
  // 최초 진입 시점의 생성 체인은 effect 본문 안에서 바로 이어서 처리한다.
  useEffect(() => {
    if (!diagnosis || isRunningRef.current) return;
    isRunningRef.current = true;
    createSpaceSeasonAndPlacements(diagnosis, progressRef.current)
      .then(handleSuccess, handleFailure)
      .finally(() => { isRunningRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis]);

  // 버튼 클릭으로 재시도할 때는 effect 제약이 없어 일반적인 async 함수로 호출한다.
  async function retryAutoCreate() {
    if (!diagnosis || isRunningRef.current) return;
    isRunningRef.current = true;
    setMode("loading");
    setAutoCreateError("");

    try {
      const result = await createSpaceSeasonAndPlacements(diagnosis, progressRef.current);
      handleSuccess(result);
    } catch (error) {
      handleFailure(error);
    } finally {
      isRunningRef.current = false;
    }
  }

  return { autoCreateError, emptySeasonId, mode, retryAutoCreate };
}

function AutoCreateLoadingNotice() {
  return (
    <p className={styles.diagnosisNotice} role="status">
      진단한 내용으로 텃밭을 만들고 있어요… 잠시만 기다려 주세요.
    </p>
  );
}

function AutoCreateEmptyNotice({ seasonId }: { seasonId: string }) {
  return (
    <p className={styles.diagnosisNotice} role="status">
      추천할 수 있는 작물이 없어 화분을 빈 채로 만들었어요. 화분·시즌은 만들어졌으니
      직접 작물을 배치해 주세요.
      {" "}
      <Link href={`/seasons/${seasonId}/placements`}>화분 배치하러 가기</Link>
    </p>
  );
}

function AutoCreateErrorNotice({
  message,
  onRetry,
  skipHref,
}: {
  message: string;
  onRetry: () => void;
  skipHref: string;
}) {
  return (
    <p className={styles.errorMessage} role="alert">
      {message || "텃밭을 만드는 중 문제가 발생했습니다."}
      {" "}
      <button onClick={onRetry} type="button">다시 시도</button>
      {" "}
      <Link href={skipHref}>직접 입력해서 만들기</Link>
    </p>
  );
}

export function SpaceForm({ initialType, skipDiagnosis = false, space }: SpaceFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<GrowingSpaceFormValues>(() =>
    space ? toFormValues(space) : createEmptyValues(initialType),
  );
  const [errors, setErrors] = useState<GrowingSpaceErrors>({});
  const [formError, setFormError] = useState("");
  const { autoCreateError, emptySeasonId, mode, retryAutoCreate } = useDiagnosisAutoCreate(
    Boolean(space) || skipDiagnosis,
  );

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

  if (mode === "loading") return <AutoCreateLoadingNotice />;
  if (mode === "empty") return <AutoCreateEmptyNotice seasonId={emptySeasonId} />;
  if (mode === "error") {
    return (
      <AutoCreateErrorNotice
        message={autoCreateError}
        onRetry={retryAutoCreate}
        skipHref={`/spaces/new?type=${initialType}&skipDiagnosis=1`}
      />
    );
  }

  return (
    <form className={styles.formLayout} noValidate onSubmit={submit}>
      <div className={styles.formMain}>
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

function diagnosisSpaceName(location: "balcony" | "window" | "indoor"): string {
  if (location === "balcony") return "베란다 텃밭";
  if (location === "window") return "창가 텃밭";
  return "실내 텃밭";
}

function diagnosisSeasonName(location: "balcony" | "window" | "indoor"): string {
  return `${diagnosisSpaceName(location)} 첫 시즌`;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 진단 추천에 등장한 화분별 작물을 실제 작물 도감 id 기준으로 합산해
 * 화분 배치 입력을 만든다. 실제 도감에 대응 작물이 없거나(basil·strawberry),
 * 만들어진 공간 유형이 그 작물을 지원하지 않으면(예: 실내 화분의 토마토·고추)
 * 조용히 제외한다.
 */
function buildDiagnosisPlacements(
  recommendation: ReturnType<typeof createGardenRecommendation>,
  spaceId: string,
  spaceType: GrowingSpaceType,
): ContainerPlacementInput[] {
  const totals = new Map<string, number>();

  for (const planter of recommendation.planters) {
    for (const crop of planter.crops) {
      const catalogId = DIAGNOSIS_CROP_TO_CATALOG_ID[crop.cropId];
      if (!catalogId) continue;
      const reference = CROP_REFERENCES.find((item) => item.id === catalogId);
      if (!reference || !reference.supportedSpaces.includes(spaceType)) continue;
      totals.set(catalogId, (totals.get(catalogId) ?? 0) + crop.seedlingCount);
    }
  }

  return [...totals.entries()].map(([cropId, quantity], index) => ({
    spaceId,
    cropId,
    quantity: Math.min(quantity, 500),
    position: { order: index },
  }));
}

/**
 * 화분·시즌·배치를 순서대로 만든다. progress에 이미 만들어진 공간·시즌이
 * 있으면(재시도) 다시 만들지 않고 이어서 진행해, 실패 후 재시도할 때
 * 중복 공간·시즌이 쌓이지 않도록 한다.
 */
async function createSpaceSeasonAndPlacements(
  diagnosis: GardenConfiguration,
  progress: { space?: GrowingSpace; seasonId?: string; seasonVersion?: number },
): Promise<{ placementCount: number; seasonId: string }> {
  const spaceType = diagnosisSpaceType(diagnosis.sunlight.location);
  const recommendation = createGardenRecommendation(diagnosis);

  const space = progress.space ?? await createGrowingSpace({
    name: diagnosisSpaceName(diagnosis.sunlight.location),
    type: spaceType,
    sunlight: diagnosisSunlightExposure(diagnosis.sunlight.duration),
    widthCm: diagnosis.planter.widthCm,
    lengthCm: diagnosis.planter.heightCm,
    depthCm: diagnosis.planter.depthCm,
    address: null,
    latitude: null,
    longitude: null,
    orientation: null,
    shadeLevel: null,
    estimatedSunlightHours: null,
    notes: "",
  });
  progress.space = space;

  const placements = buildDiagnosisPlacements(recommendation, space.id, spaceType);

  if (!progress.seasonId) {
    const today = new Date();
    const endDate = new Date(today.getTime() + SEASON_DURATION_DAYS * 86_400_000);
    const season = await createGrowingSeason({
      spaceId: space.id,
      name: diagnosisSeasonName(diagnosis.sunlight.location),
      startDate: formatDateOnly(today),
      endDate: formatDateOnly(endDate),
      notes: "",
      featuredCropId: placements[0]?.cropId ?? null,
    });
    progress.seasonId = season.id;
    progress.seasonVersion = season.version;
  }

  await putContainerPlacements(progress.seasonId, progress.seasonVersion!, placements);

  return { placementCount: placements.length, seasonId: progress.seasonId };
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
