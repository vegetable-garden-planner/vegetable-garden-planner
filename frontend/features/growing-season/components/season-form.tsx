"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import type { CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { SeasonField } from "@/features/growing-season/components/season-field";
import {
  validateGrowingSeason,
  type PersistedGrowingSeason,
  type GrowingSeasonErrors,
  type GrowingSeasonFormValues,
} from "@/features/growing-season/domain/growing-season";
import {
  createGrowingSeason,
  updateGrowingSeason,
} from "@/features/growing-season/infrastructure/season-api";
import {
  useGrowingSeasons,
  type GrowingSeasonsState,
} from "@/features/growing-season/hooks/use-growing-seasons";
import {
  useGrowingSpaces,
  type GrowingSpacesState,
} from "@/features/growing-space/hooks/use-growing-spaces";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import styles from "@/features/growing-season/components/growing-season.module.css";

interface SeasonFormProps {
  initialSpaceId: string;
  initialCropId?: string;
  season?: PersistedGrowingSeason;
}

export function SeasonForm({ initialCropId = "", initialSpaceId, season }: SeasonFormProps) {
  const router = useRouter();
  const cropCatalog = useCropCatalog();
  const initialCrop = cropCatalog.crops.find((crop) => crop.id === initialCropId);
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const [values, setValues] = useState<GrowingSeasonFormValues>(() =>
    season ? toFormValues(season) : createEmptyValues(initialSpaceId, initialCrop),
  );
  const [featuredCropId, setFeaturedCropId] = useState(
    season?.featuredCropId ?? initialCrop?.id ?? "",
  );
  const [errors, setErrors] = useState<GrowingSeasonErrors>({});
  const [formError, setFormError] = useState("");

  function update<K extends keyof GrowingSeasonFormValues>(
    key: K,
    value: GrowingSeasonFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (spacesState.status !== "ready" || seasonsState.status !== "ready") return;

    const result = validateGrowingSeason(
      values,
      compatibleSpaces.map((space) => space.id),
      seasons,
      season?.id,
    );
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    const cropSelection = resolveCropSelection(selectedSpace, compatibleCrops, featuredCropId);
    if (cropSelection.error) {
      setFormError(cropSelection.error);
      return;
    }

    const input = {
      ...result.value,
      featuredCropId: cropSelection.cropId,
    };

    try {
      await persistSeason(season, input);
      router.push(`/seasons?spaceId=${encodeURIComponent(input.spaceId)}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "시즌을 저장하지 못했습니다.");
    }
  }

  const formStatus = getSeasonFormStatus({
    cropState: cropCatalog,
    hasInvalidInitialCrop: Boolean(initialCropId && !initialCrop),
    seasonState: seasonsState,
    spaceState: spacesState,
  });

  if (formStatus) {
    return <SeasonFormStatus status={formStatus} />;
  }

  const spaces = requireReadySpaces(spacesState);
  const seasons = requireReadySeasons(seasonsState);

  if (spaces.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span aria-hidden="true">01</span>
        <h2 className="text-xl font-bold">먼저 재배 공간을 등록해 주세요</h2>
        <strong>시즌은 텃밭, 베란다 또는 실내 화분 공간에 연결해서 관리합니다.</strong>
        <div><Link href="/spaces/new">재배 공간 등록 →</Link></div>
      </div>
    );
  }

  const compatibleSpaces = initialCrop
    ? spaces.filter((space) => initialCrop.supportedSpaces.includes(space.type))
    : spaces;
  const selectedSpace = spaces.find((space) => space.id === values.spaceId);
  const compatibleCrops = cropsForSpace(cropCatalog.crops, selectedSpace);
  const selectedCrop = compatibleCrops.find((crop) => crop.id === featuredCropId);

  if (initialCrop && compatibleSpaces.length === 0) {
    const recommendedType = initialCrop.supportedSpaces[0] ?? "indoor";
    return (
      <div className={styles.emptyState}>
        <span aria-hidden="true">01</span>
        <h2 className="text-xl font-bold">{initialCrop.name}에 맞는 공간이 없어요</h2>
        <strong>{GROWING_SPACE_LABELS[recommendedType]} 공간을 먼저 등록한 뒤 재배를 시작해 주세요.</strong>
        <div><Link href={`/spaces/new?type=${recommendedType}`}>알맞은 공간 등록하기 →</Link></div>
      </div>
    );
  }

  return (
    <SeasonFormView
      compatibleCrops={compatibleCrops}
      compatibleSpaces={compatibleSpaces}
      errors={errors}
      featuredCropId={featuredCropId}
      formError={formError}
      initialCrop={initialCrop}
      onCropChange={setFeaturedCropId}
      onSubmit={submit}
      onUpdate={update}
      season={season}
      selectedCrop={selectedCrop}
      selectedSpace={selectedSpace}
      values={values}
    />
  );
}

interface SeasonFormViewProps {
  compatibleCrops: readonly CropReference[];
  compatibleSpaces: readonly GrowingSpace[];
  errors: GrowingSeasonErrors;
  featuredCropId: string;
  formError: string;
  initialCrop: CropReference | undefined;
  onCropChange: (cropId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdate: <K extends keyof GrowingSeasonFormValues>(key: K, value: GrowingSeasonFormValues[K]) => void;
  season: PersistedGrowingSeason | undefined;
  selectedCrop: CropReference | undefined;
  selectedSpace: GrowingSpace | undefined;
  values: GrowingSeasonFormValues;
}

function SeasonFormView(props: SeasonFormViewProps) {
  function updateSpace(spaceId: string) {
    props.onUpdate("spaceId", spaceId);
    props.onCropChange("");
  }

  return (
    <form className={styles.formLayout} noValidate onSubmit={props.onSubmit}>
      <div className={styles.formMain}>
        {props.initialCrop && (
          <div className={styles.cropNotice}>
            <div>
              <p>선택한 식물</p>
              <h2>{props.initialCrop.name}</h2>
              <span>권장 시기를 포함하도록 시즌 기간을 정하면 자동 일정을 만들 수 있어요.</span>
            </div>
            <dl>
              <div><dt>권장 심기</dt><dd>{props.initialCrop.plantingPeriod.label}</dd></div>
              <div><dt>권장 수확</dt><dd>{props.initialCrop.harvestPeriod.label}</dd></div>
            </dl>
          </div>
        )}
        <section className={styles.formSection}>
          <SeasonSectionHeading
            description="이번 시즌을 연결할 공간을 고르면 가능한 작물만 안내합니다."
            number="01"
            title="공간과 작물"
          />
          <SeasonField error={props.errors.spaceId} id="season-space" label="재배 공간">
            <select
              aria-describedby={props.errors.spaceId ? "season-space-error" : undefined}
              aria-invalid={Boolean(props.errors.spaceId)}
              className={styles.input}
              id="season-space"
              onChange={(event) => updateSpace(event.target.value)}
              value={props.values.spaceId}
            >
              <option value="">공간 선택</option>
              {props.compatibleSpaces.map((space) => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </SeasonField>
          <SeasonCropField
            crops={props.compatibleCrops}
            onChange={props.onCropChange}
            selectedCropId={props.featuredCropId}
            space={props.selectedSpace}
          />
        </section>
        <section className={styles.formSection}>
          <SeasonSectionHeading
            description="목록에서 알아보기 쉬운 이름과 실제 관리할 날짜를 정해 주세요."
            number="02"
            title="이름과 재배 기간"
          />
          <SeasonField error={props.errors.name} id="season-name" label="시즌 이름">
            <input
              aria-describedby={props.errors.name ? "season-name-error" : undefined}
              aria-invalid={Boolean(props.errors.name)}
              className={styles.input}
              id="season-name"
              maxLength={30}
              onChange={(event) => props.onUpdate("name", event.target.value)}
              placeholder="예: 2026년 봄 시즌"
              value={props.values.name}
            />
          </SeasonField>
          <div className={styles.fieldGrid}>
            <SeasonField error={props.errors.startDate} id="season-start" label={getStartDateLabel(props.initialCrop)}>
              <input
                aria-describedby={props.errors.startDate ? "season-start-error" : undefined}
                aria-invalid={Boolean(props.errors.startDate)}
                className={styles.input}
                id="season-start"
                onChange={(event) => props.onUpdate("startDate", event.target.value)}
                type="date"
                value={props.values.startDate}
              />
            </SeasonField>
            <SeasonField error={props.errors.endDate} id="season-end" label={getEndDateLabel(props.initialCrop)}>
              <input
                aria-describedby={props.errors.endDate ? "season-end-error" : undefined}
                aria-invalid={Boolean(props.errors.endDate)}
                className={styles.input}
                id="season-end"
                min={props.values.startDate || undefined}
                onChange={(event) => props.onUpdate("endDate", event.target.value)}
                type="date"
                value={props.values.endDate}
              />
            </SeasonField>
          </div>
        </section>
        <section className={styles.formSection}>
          <SeasonSectionHeading
            description="이번 시즌의 목표나 확인할 환경 변화를 남겨두세요."
            number="03"
            title="시즌 메모"
          />
          <SeasonField id="season-notes" label="메모 (선택)">
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              id="season-notes"
              maxLength={300}
              onChange={(event) => props.onUpdate("notes", event.target.value)}
              placeholder="이번 시즌의 목표나 키우고 싶은 작물을 기록해 보세요."
              value={props.values.notes}
            />
          </SeasonField>
        </section>
        {props.formError && <p className={styles.errorMessage} role="alert">{props.formError}</p>}
        <button className={styles.submitButton} type="submit">
          {props.season ? "변경 내용 저장" : "시즌 등록하기"} <span>→</span>
        </button>
      </div>
      <SeasonFormSummary
        cropName={props.selectedCrop?.name}
        endDate={props.values.endDate}
        seasonName={props.values.name}
        space={props.selectedSpace}
        startDate={props.values.startDate}
      />
    </form>
  );
}

function SeasonSectionHeading({
  description,
  number,
  title,
}: {
  description: string;
  number: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function SeasonFormSummary({
  cropName,
  endDate,
  seasonName,
  space,
  startDate,
}: {
  cropName: string | undefined;
  endDate: string;
  seasonName: string;
  space: GrowingSpace | undefined;
  startDate: string;
}) {
  return (
    <aside className={styles.formAside} aria-label="입력 중인 시즌 요약">
      <p>시즌 미리보기</p>
      <h2>{seasonName.trim() || "시즌 이름을 입력해 주세요"}</h2>
      <span>{space?.name ?? "공간 선택 전"}</span>
      <dl>
        <div><dt>작물</dt><dd>{getSummaryCropName(space, cropName)}</dd></div>
        <div><dt>시작일</dt><dd>{startDate || "입력 전"}</dd></div>
        <div><dt>종료일</dt><dd>{endDate || "입력 전"}</dd></div>
      </dl>
      <div className={styles.asideGuide}>
        <strong>등록 후 다음 단계</strong>
        <p>{getNextStepGuide(space)}</p>
      </div>
    </aside>
  );
}

function getSummaryCropName(space: GrowingSpace | undefined, cropName: string | undefined) {
  if (cropName) return cropName;
  if (! space) return "공간 선택 전";
  return space.type === "garden" ? "배치 단계에서 선택" : "선택 전";
}

function getNextStepGuide(space: GrowingSpace | undefined) {
  if (! space) return "공간을 선택하면 유형에 맞는 다음 재배 단계를 안내합니다.";
  return space.type === "garden"
    ? "격자를 만들고 여러 작물을 배치한 뒤 재배 일정을 준비합니다."
    : "선택한 대표 작물로 격자 없이 재배 일정을 준비합니다.";
}

function getStartDateLabel(crop: CropReference | undefined) {
  return crop ? `시작일 · 권장 심기 ${crop.plantingPeriod.label}` : "시작일";
}

function getEndDateLabel(crop: CropReference | undefined) {
  return crop ? `종료일 · 권장 수확 ${crop.harvestPeriod.label}` : "종료일";
}

type SeasonFormStatusInput = {
  cropState: { message?: string; status: string };
  hasInvalidInitialCrop: boolean;
  seasonState: { message?: string; status: string };
  spaceState: { message?: string; status: string };
};

function getSeasonFormStatus(input: SeasonFormStatusInput) {
  if (input.spaceState.status === "error") {
    return { isError: true, message: input.spaceState.message ?? "공간 정보를 불러오지 못했습니다." };
  }
  if (input.cropState.status === "error") {
    return { isError: true, message: input.cropState.message ?? "작물 정보를 불러오지 못했습니다." };
  }
  if (input.cropState.status === "loading") {
    return { isError: false, message: "작물 정보를 불러오고 있습니다." };
  }
  if (input.hasInvalidInitialCrop) {
    return { isError: true, message: "선택한 작물 정보를 찾을 수 없습니다." };
  }
  if (input.seasonState.status === "error") {
    return { isError: true, message: input.seasonState.message ?? "시즌 정보를 불러오지 못했습니다." };
  }
  if (input.spaceState.status === "loading" || input.seasonState.status === "loading") {
    return { isError: false, message: "시즌 입력 정보를 불러오고 있습니다." };
  }

  return null;
}

function SeasonFormStatus({ status }: { status: { isError: boolean; message: string } }) {
  const className = status.isError ? styles.errorMessage : styles.formLoading;

  return <p className={className} role={status.isError ? "alert" : undefined}>{status.message}</p>;
}

function requireReadySpaces(state: GrowingSpacesState): GrowingSpace[] {
  if (state.status !== "ready") throw new Error("재배 공간을 불러오지 못했습니다.");
  return state.spaces;
}

function requireReadySeasons(state: GrowingSeasonsState): PersistedGrowingSeason[] {
  if (state.status !== "ready") throw new Error("재배 시즌을 불러오지 못했습니다.");
  return state.seasons;
}

async function persistSeason(
  season: PersistedGrowingSeason | undefined,
  input: Parameters<typeof createGrowingSeason>[0],
) {
  if (season) {
    await updateGrowingSeason(season, input);
    return;
  }
  await createGrowingSeason(input);
}

function SeasonCropField({
  crops,
  onChange,
  selectedCropId,
  space,
}: {
  crops: readonly CropReference[];
  onChange: (cropId: string) => void;
  selectedCropId: string;
  space: GrowingSpace | undefined;
}) {
  const selectedValue = crops.some((crop) => crop.id === selectedCropId) ? selectedCropId : "";
  const hasSpace = Boolean(space);
  const isGarden = space?.type === "garden";
  return (
    <SeasonField id="season-crop" label={isGarden ? "대표 작물 (선택)" : "키울 작물"}>
      <select
        className={styles.input}
        disabled={! hasSpace}
        id="season-crop"
        onChange={(event) => onChange(event.target.value)}
        value={selectedValue}
      >
        <option value="">{hasSpace ? "작물 선택" : "공간을 먼저 선택해 주세요"}</option>
        {hasSpace && crops.map((crop) => (
          <option key={crop.id} value={crop.id}>{crop.name} · 권장 심기 {crop.plantingPeriod.label}</option>
        ))}
      </select>
      <p className={styles.fieldHelp}>
        {getCropFieldHelp(space)}
      </p>
    </SeasonField>
  );
}

function getCropFieldHelp(space: GrowingSpace | undefined) {
  if (! space) return "공간을 선택하면 해당 환경에서 키울 수 있는 작물만 보여 드립니다.";
  return space.type === "garden"
    ? "텃밭은 다음 단계의 격자에서 여러 작물을 배치할 수 있습니다."
    : "화분·베란다는 격자 없이 선택한 작물로 재배 일정을 만듭니다.";
}

function cropsForSpace(crops: readonly CropReference[], space: GrowingSpace | undefined) {
  if (!space) return crops;
  return crops.filter((crop) => crop.supportedSpaces.includes(space.type));
}

function resolveCropSelection(
  space: GrowingSpace | undefined,
  crops: readonly CropReference[],
  cropId: string,
): { cropId: string | null; error: string } {
  const isCompatible = crops.some((crop) => crop.id === cropId);
  if (space?.type !== "garden" && !isCompatible) {
    return { cropId: null, error: "화분·베란다 시즌에서 키울 작물을 선택해 주세요." };
  }
  return { cropId: isCompatible ? cropId : null, error: "" };
}

function createEmptyValues(
  initialSpaceId: string,
  initialCrop?: CropReference,
): GrowingSeasonFormValues {
  return {
    spaceId: initialSpaceId,
    name: initialCrop ? `${initialCrop.name} 관리` : "",
    startDate: "",
    endDate: "",
    notes: initialCrop ? `선택 식물: ${initialCrop.name}` : "",
  };
}

function toFormValues(season: PersistedGrowingSeason): GrowingSeasonFormValues {
  return {
    spaceId: season.spaceId,
    name: season.name,
    startDate: season.startDate,
    endDate: season.endDate,
    notes: season.notes,
  };
}
