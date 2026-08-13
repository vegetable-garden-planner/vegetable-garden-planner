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
      <div className="rounded-2xl border border-dashed border-leaf/30 p-7 text-center">
        <h2 className="text-xl font-bold">먼저 재배 공간을 등록해 주세요</h2>
        <p className="mt-3 leading-7 text-muted">시즌은 텃밭, 베란다 또는 실내 화분 공간에 연결해서 관리합니다.</p>
        <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/spaces/new">재배 공간 등록</Link>
      </div>
    );
  }

  const compatibleSpaces = initialCrop
    ? spaces.filter((space) => initialCrop.supportedSpaces.includes(space.type))
    : spaces;
  const selectedSpace = spaces.find((space) => space.id === values.spaceId);
  const compatibleCrops = cropsForSpace(cropCatalog.crops, selectedSpace);

  if (initialCrop && compatibleSpaces.length === 0) {
    const recommendedType = initialCrop.supportedSpaces[0] ?? "indoor";
    return (
      <div className="rounded-2xl border border-dashed border-leaf/30 p-7 text-center">
        <h2 className="text-xl font-bold">{initialCrop.name}에 맞는 공간이 없어요</h2>
        <p className="mt-3 leading-7 text-muted">{GROWING_SPACE_LABELS[recommendedType]} 공간을 먼저 등록한 뒤 재배를 시작해 주세요.</p>
        <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href={`/spaces/new?type=${recommendedType}`}>알맞은 공간 등록하기</Link>
      </div>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      {initialCrop && (
        <div className="rounded-2xl bg-leaf-soft/60 p-5">
          <p className="text-sm font-bold text-leaf">선택한 식물</p>
          <p className="mt-1 text-xl font-bold">{initialCrop.name}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 px-4 py-3">
              <dt className="text-muted">권장 심기</dt>
              <dd className="mt-1 font-bold">{initialCrop.plantingPeriod.label}</dd>
            </div>
            <div className="rounded-xl bg-white/70 px-4 py-3">
              <dt className="text-muted">권장 수확</dt>
              <dd className="mt-1 font-bold">{initialCrop.harvestPeriod.label}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-muted">위 심기와 수확 시기가 모두 포함되도록 아래 시즌 기간을 정하면 자동 일정을 만들 수 있습니다.</p>
        </div>
      )}
      <SeasonField error={errors.spaceId} id="season-space" label="재배 공간">
        <select aria-describedby={errors.spaceId ? "season-space-error" : undefined} aria-invalid={Boolean(errors.spaceId)} className="form-input" id="season-space" onChange={(event) => update("spaceId", event.target.value)} value={values.spaceId}>
          <option value="">공간 선택</option>
          {compatibleSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
        </select>
      </SeasonField>
      <SeasonCropField
        crops={compatibleCrops}
        onChange={setFeaturedCropId}
        selectedCropId={featuredCropId}
        space={selectedSpace}
      />
      <SeasonField error={errors.name} id="season-name" label="시즌 이름">
        <input aria-describedby={errors.name ? "season-name-error" : undefined} aria-invalid={Boolean(errors.name)} className="form-input" id="season-name" maxLength={30} onChange={(event) => update("name", event.target.value)} placeholder="예: 2026년 봄 시즌" value={values.name} />
      </SeasonField>
      <div className="grid gap-5 sm:grid-cols-2">
        <SeasonField error={errors.startDate} id="season-start" label={initialCrop ? `시작일 · 권장 심기 ${initialCrop.plantingPeriod.label}` : "시작일"}>
          <input aria-describedby={errors.startDate ? "season-start-error" : undefined} aria-invalid={Boolean(errors.startDate)} className="form-input" id="season-start" onChange={(event) => update("startDate", event.target.value)} type="date" value={values.startDate} />
        </SeasonField>
        <SeasonField error={errors.endDate} id="season-end" label={initialCrop ? `종료일 · 권장 수확 ${initialCrop.harvestPeriod.label}` : "종료일"}>
          <input aria-describedby={errors.endDate ? "season-end-error" : undefined} aria-invalid={Boolean(errors.endDate)} className="form-input" id="season-end" min={values.startDate || undefined} onChange={(event) => update("endDate", event.target.value)} type="date" value={values.endDate} />
        </SeasonField>
      </div>
      <SeasonField id="season-notes" label="메모 (선택)">
        <textarea className="form-input min-h-28 resize-y" id="season-notes" maxLength={300} onChange={(event) => update("notes", event.target.value)} placeholder="이번 시즌의 목표나 키우고 싶은 작물을 기록해 보세요." value={values.notes} />
      </SeasonField>
      {formError && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{formError}</p>}
      <button className="w-full rounded-full bg-leaf px-6 py-3.5 font-bold text-white hover:bg-leaf-dark" type="submit">{season ? "변경 내용 저장" : "시즌 등록하기"}</button>
    </form>
  );
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

  return null;
}

function SeasonFormStatus({ status }: { status: { isError: boolean; message: string } }) {
  const className = status.isError
    ? "rounded-2xl bg-red-50 p-5 font-semibold text-red-700"
    : "text-muted";

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
  const isGarden = space?.type === "garden";
  return (
    <SeasonField id="season-crop" label={isGarden ? "대표 작물 (선택)" : "키울 작물"}>
      <select className="form-input" id="season-crop" onChange={(event) => onChange(event.target.value)} value={selectedValue}>
        <option value="">작물 선택</option>
        {crops.map((crop) => (
          <option key={crop.id} value={crop.id}>{crop.name} · 권장 심기 {crop.plantingPeriod.label}</option>
        ))}
      </select>
      <p className="mt-2 text-sm text-muted">
        {isGarden
          ? "텃밭은 다음 단계의 격자에서 여러 작물을 배치할 수 있습니다."
          : "화분·베란다는 격자 없이 선택한 작물로 재배 일정을 만듭니다."}
      </p>
    </SeasonField>
  );
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
