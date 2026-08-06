"use client";

import { useMemo, useState } from "react";
import {
  filterCropReferences,
  type CropCategory,
  type CropDifficulty,
  type CropReference,
  type PlantingMaterial,
} from "@/features/crop-catalog/domain/crop-reference";
import type { GrowingSpaceType } from "@/shared/domain/growing-environment";

const CATEGORY_OPTIONS: readonly { value: CropCategory | "all"; label: string }[] = [
  { value: "all", label: "전체 종류" },
  { value: "leaf", label: "잎채소" },
  { value: "fruit", label: "열매채소" },
  { value: "root", label: "뿌리채소" },
  { value: "legume", label: "콩류" },
  { value: "tuber", label: "덩이줄기" },
];

const SPACE_OPTIONS: readonly { value: GrowingSpaceType | "all"; label: string }[] = [
  { value: "all", label: "전체 공간" },
  { value: "indoor", label: "실내 화분" },
  { value: "balcony", label: "베란다" },
  { value: "garden", label: "마당·텃밭" },
];

const CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: "잎채소",
  fruit: "열매채소",
  root: "뿌리채소",
  legume: "콩류",
  tuber: "덩이줄기",
};

const DIFFICULTY_LABELS: Record<CropDifficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  challenging: "관리가 필요해요",
};

const MATERIAL_LABELS: Record<PlantingMaterial, string> = {
  seed: "씨앗",
  seedling: "모종",
  "seed-potato": "씨감자",
};

const SPACE_LABELS: Record<GrowingSpaceType, string> = {
  indoor: "실내 화분",
  balcony: "베란다",
  garden: "마당·텃밭",
};

export function CropCatalog({ crops }: { crops: readonly CropReference[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CropCategory | "all">("all");
  const [space, setSpace] = useState<GrowingSpaceType | "all">("all");
  const filteredCrops = useMemo(
    () => filterCropReferences(crops, { query, category, space }),
    [category, crops, query, space],
  );

  return (
    <div>
      <div className="grid gap-3 rounded-3xl border border-ink/10 bg-white p-5 sm:grid-cols-3">
        <label className="sm:col-span-1">
          <span className="mb-2 block text-sm font-bold">작물 검색</span>
          <input className="form-input" onChange={(event) => setQuery(event.target.value)} placeholder="이름, 과명, 특징" type="search" value={query} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">작물 종류</span>
          <select className="form-input" onChange={(event) => setCategory(event.target.value as CropCategory | "all")} value={category}>
            {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">재배 공간</span>
          <select className="form-input" onChange={(event) => setSpace(event.target.value as GrowingSpaceType | "all")} value={space}>
            {SPACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <p className="mb-5 mt-8 text-sm font-bold text-muted">조건에 맞는 작물 {filteredCrops.length}종</p>
      {filteredCrops.length === 0
        ? <EmptyResult />
        : <CropCards crops={filteredCrops} />}
    </div>
  );
}

function CropCards({ crops }: { crops: readonly CropReference[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {crops.map((crop) => (
        <li className="rounded-3xl border border-ink/10 bg-white p-6" key={crop.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-leaf">{CATEGORY_LABELS[crop.category]} · {crop.familyName}</p>
              <h2 className="mt-2 text-2xl font-bold">{crop.name}</h2>
            </div>
            <span className="rounded-full bg-leaf-soft px-3 py-1.5 text-xs font-bold text-leaf-dark">{DIFFICULTY_LABELS[crop.difficulty]}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">{crop.summary}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink/10 pt-5 text-sm">
            <CropFact label="심는 시기" value={crop.plantingPeriod.label} />
            <CropFact label="수확 시기" value={crop.harvestPeriod.label} />
            <CropFact label="시작 재료" value={MATERIAL_LABELS[crop.plantingMaterial]} />
            <CropFact label="포기 간격" value={`${crop.plantSpacingCm}cm`} />
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {crop.supportedSpaces.map((supportedSpace) => (
              <span className="rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-muted" key={supportedSpace}>{SPACE_LABELS[supportedSpace]}</span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CropFact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>;
}

function EmptyResult() {
  return (
    <div className="rounded-3xl border border-dashed border-leaf/30 bg-white p-8 text-center">
      <h2 className="text-xl font-bold">조건에 맞는 작물이 없어요</h2>
      <p className="mt-3 text-muted">검색어나 필터를 바꿔 다시 확인해 보세요.</p>
    </div>
  );
}
