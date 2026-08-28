"use client";

import { useMemo, useState } from "react";
import { CropCard } from "@/features/crop-catalog/components/crop-card";
import { CROP_CATEGORY_LABELS, GROWING_SPACE_LABELS } from "@/features/crop-catalog/data/crop-labels";
import { filterCropReferences, type CropCategory } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import type { GrowingSpaceType } from "@/shared/domain/growing-environment";
import styles from "./crop-catalog.module.css";

const CATEGORY_OPTIONS: readonly (CropCategory | "all")[] = [
  "all", "leaf", "fruit", "root", "legume", "tuber", "flower",
];

const SPACE_OPTIONS: readonly (GrowingSpaceType | "all")[] = [
  "all", "indoor", "balcony", "garden",
];

export function CropCatalog() {
  const catalog = useCropCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CropCategory | "all">("all");
  const [space, setSpace] = useState<GrowingSpaceType | "all">("all");
  const filteredCrops = useMemo(
    () => filterCropReferences(catalog.crops, { query, category, space }),
    [catalog.crops, category, query, space],
  );

  if (catalog.status === "loading") return <CatalogLoading />;
  if (catalog.status === "error") return <CatalogError message={catalog.message} />;

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setSpace("all");
  };

  return (
    <div className={styles.catalog}>
      <CatalogSummary
        cropCount={catalog.crops.length}
        easyCount={catalog.crops.filter((crop) => crop.difficulty === "easy").length}
        indoorCount={catalog.crops.filter((crop) => crop.supportedSpaces.includes("indoor")).length}
        sourceCount={catalog.sources.length}
      />
      <section className={styles.browser} aria-labelledby="crop-browser-title">
        <div className={styles.browserHeading}>
          <div><p>내 환경에 맞춰 찾기</p><h2 id="crop-browser-title">작물과 꽃 가이드</h2></div>
          <p>이름이나 특징을 검색하고, 키울 공간과 종류를 골라 보세요.</p>
        </div>
        <div className={styles.primaryFilters}>
          <label><span>식물 검색</span><input onChange={(event) => setQuery(event.target.value)} placeholder="이름, 과명, 특징을 검색해 보세요" type="search" value={query} /></label>
          <label><span>재배 공간</span><select onChange={(event) => setSpace(event.target.value as GrowingSpaceType | "all")} value={space}>{SPACE_OPTIONS.map((option) => <option key={option} value={option}>{spaceLabel(option)}</option>)}</select></label>
        </div>
        <div className={styles.categoryFilters} aria-label="식물 종류 필터">
          {CATEGORY_OPTIONS.map((option) => <button aria-pressed={category === option} key={option} onClick={() => setCategory(option)} type="button">{categoryLabel(option)}</button>)}
        </div>
      </section>

      <section className={styles.results} aria-labelledby="crop-results-title" aria-live="polite">
        <div className={styles.resultsHeading}>
          <div><p>검색 결과</p><h2 id="crop-results-title">조건에 맞는 식물 <strong>{filteredCrops.length}종</strong></h2></div>
          {(query || category !== "all" || space !== "all") && <button onClick={resetFilters} type="button">조건 초기화</button>}
        </div>
        {filteredCrops.length === 0
          ? <EmptyResult onReset={resetFilters} />
          : <ul className={styles.cards}>{filteredCrops.map((crop) => <CropCard crop={crop} key={crop.id} />)}</ul>}
      </section>

      <Sources sources={catalog.sources} />
    </div>
  );
}

function CatalogSummary(props: { cropCount: number; easyCount: number; indoorCount: number; sourceCount: number }) {
  return <section className={styles.catalogSummary} aria-label="작물 기준정보 현황"><SummaryStat label="등록 식물" value={`${props.cropCount}종`} /><SummaryStat label="처음 키우기 쉬움" value={`${props.easyCount}종`} /><SummaryStat label="실내 관리 가능" value={`${props.indoorCount}종`} /><SummaryStat label="공식 자료" value={`${props.sourceCount}건`} /></section>;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function EmptyResult({ onReset }: { onReset: () => void }) {
  return <div className={styles.empty}><span aria-hidden="true">?</span><h3>조건에 맞는 식물이 없어요</h3><p>검색어를 줄이거나 공간·종류 조건을 다시 선택해 주세요.</p><button onClick={onReset} type="button">전체 식물 다시 보기</button></div>;
}

function Sources({ sources }: { sources: readonly { id: string; organization: string; title: string; url: string }[] }) {
  return <section className={styles.sources} aria-labelledby="crop-sources-title"><div><p>검증된 재배 정보</p><h2 id="crop-sources-title">공식 자료를 기준으로 정리했어요</h2><span>각 상세 화면에서 작물별 출처와 최종 검토일을 확인할 수 있습니다.</span></div><ul>{sources.map((source) => <li key={source.id}><a href={source.url} rel="noreferrer" target="_blank"><strong>{source.organization}</strong><span>{source.title}</span><b aria-hidden="true">↗</b></a></li>)}</ul></section>;
}

function CatalogLoading() {
  return <div className={styles.loading} aria-label="작물 정보를 불러오는 중" role="status"><span /><span /><span /></div>;
}

function CatalogError({ message }: { message: string }) {
  return <div className={styles.error} role="alert"><h2>작물 정보를 불러오지 못했어요</h2><p>{message}</p><button onClick={() => window.location.reload()} type="button">다시 불러오기</button></div>;
}

function categoryLabel(category: CropCategory | "all") {
  return category === "all" ? "전체" : CROP_CATEGORY_LABELS[category];
}

function spaceLabel(space: GrowingSpaceType | "all") {
  return space === "all" ? "모든 공간" : GROWING_SPACE_LABELS[space];
}
