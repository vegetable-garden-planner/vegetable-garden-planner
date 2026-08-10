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
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

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
      seasonsState.seasons,
      season?.id,
    );
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    const input = {
      ...result.value,
      featuredCropId: season?.featuredCropId ?? initialCrop?.id,
    };

    try {
      if (season) await updateGrowingSeason(season, input);
      else await createGrowingSeason(input);
      router.push(`/seasons?spaceId=${encodeURIComponent(input.spaceId)}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "시즌을 저장하지 못했습니다.");
    }
  }

  if (spacesState.status === "error") {
    return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{spacesState.message}</p>;
  }

  if (cropCatalog.status === "error") {
    return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{cropCatalog.message}</p>;
  }

  if (cropCatalog.status === "loading") {
    return <p className="text-muted">작물 정보를 불러오고 있습니다.</p>;
  }

  if (initialCropId && !initialCrop) {
    return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">선택한 작물 정보를 찾을 수 없습니다.</p>;
  }

  if (seasonsState.status === "error") {
    return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{seasonsState.message}</p>;
  }

  if (spacesState.spaces.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-leaf/30 p-7 text-center">
        <h2 className="text-xl font-bold">먼저 재배 공간을 등록해 주세요</h2>
        <p className="mt-3 leading-7 text-muted">시즌은 텃밭, 베란다 또는 실내 화분 공간에 연결해서 관리합니다.</p>
        <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/spaces/new">재배 공간 등록</Link>
      </div>
    );
  }

  const compatibleSpaces = initialCrop
    ? spacesState.spaces.filter((space) => initialCrop.supportedSpaces.includes(space.type))
    : spacesState.spaces;

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
          <p className="mt-2 text-sm leading-6 text-muted">이 시즌에 선택한 식물을 연결해 저장합니다.</p>
        </div>
      )}
      <SeasonField error={errors.spaceId} id="season-space" label="재배 공간">
        <select aria-describedby={errors.spaceId ? "season-space-error" : undefined} aria-invalid={Boolean(errors.spaceId)} className="form-input" id="season-space" onChange={(event) => update("spaceId", event.target.value)} value={values.spaceId}>
          <option value="">공간 선택</option>
          {compatibleSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
        </select>
      </SeasonField>
      <SeasonField error={errors.name} id="season-name" label="시즌 이름">
        <input aria-describedby={errors.name ? "season-name-error" : undefined} aria-invalid={Boolean(errors.name)} className="form-input" id="season-name" maxLength={30} onChange={(event) => update("name", event.target.value)} placeholder="예: 2026년 봄 시즌" value={values.name} />
      </SeasonField>
      <div className="grid gap-5 sm:grid-cols-2">
        <SeasonField error={errors.startDate} id="season-start" label="시작일">
          <input aria-describedby={errors.startDate ? "season-start-error" : undefined} aria-invalid={Boolean(errors.startDate)} className="form-input" id="season-start" onChange={(event) => update("startDate", event.target.value)} type="date" value={values.startDate} />
        </SeasonField>
        <SeasonField error={errors.endDate} id="season-end" label="종료일">
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
