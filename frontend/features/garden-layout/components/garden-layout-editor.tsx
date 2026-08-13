"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";
import { BrandMark } from "@/components/brand-mark";
import type { CropCategory, CropReference } from "@/features/crop-catalog/domain/crop-reference";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";
import { calculatePlantCount } from "@/features/garden-layout/application/calculate-plant-count";
import {
  createGardenLayout,
  GRID_CELL_SIZE_OPTIONS,
  isGardenLayoutOutdated,
  toggleCropPlacement,
  type GardenLayout,
  type GridCellSizeCm,
} from "@/features/garden-layout/domain/garden-layout";
import { useGardenLayouts } from "@/features/garden-layout/hooks/use-garden-layouts";
import { deleteGardenLayout, putGardenLayout } from "@/features/garden-layout/infrastructure/garden-layout-api";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import styles from "./garden-layout-editor.module.css";

const CROP_IMAGES: Record<CropCategory, string> = {
  leaf: "/figma/image3.png",
  fruit: "/figma/image7.png",
  root: "/figma/image8.png",
  legume: "/figma/image4.png",
  tuber: "/figma/image8.png",
  flower: "/figma/image6.png",
};

const CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: "잎채소",
  fruit: "열매채소",
  root: "뿌리채소",
  legume: "콩과",
  tuber: "덩이줄기",
  flower: "꽃",
};

export function GardenLayoutEditor({ seasonId }: { seasonId: string }) {
  const seasonsState = useGrowingSeasons();
  const spacesState = useGrowingSpaces();
  const layoutsState = useGardenLayouts();
  const cropCatalog = useCropCatalog();

  if (seasonsState.status === "error") return <LayoutStatePage status="error" message={seasonsState.message} />;
  if (spacesState.status === "error") return <LayoutStatePage status="error" message={spacesState.message} />;
  if (layoutsState.status === "error") return <LayoutStatePage status="error" message={layoutsState.message} />;
  if (cropCatalog.status === "error") return <LayoutStatePage status="error" message={cropCatalog.message} />;
  if (layoutsState.status === "loading" || cropCatalog.status === "loading") return <LayoutStatePage status="loading" />;

  const season = seasonsState.seasons.find((item) => item.id === seasonId);
  if (!season) return <LayoutStatePage status="error" message="작물 배치를 만들 시즌을 찾을 수 없습니다." />;

  const space = spacesState.spaces.find((item) => item.id === season.spaceId);
  if (!space) return <LayoutStatePage status="error" message="시즌에 연결된 재배 공간을 찾을 수 없습니다." />;
  if (space.type !== "garden") return <LayoutStatePage status="error" message="격자 배치는 마당·텃밭 공간에서 사용할 수 있습니다." />;

  const gardenCrops = cropCatalog.crops.filter((crop) => crop.supportedSpaces.includes("garden"));
  const layout = layoutsState.layouts.find((item) => item.seasonId === seasonId);
  const cropCount = layout ? new Set(layout.placements.map((placement) => placement.cropId)).size : 0;

  return (
    <main className={styles.page}>
      <GardenHero cropCount={cropCount} placementCount={layout?.placements.length ?? 0} seasonName={season.name} />
      <section className={styles.layoutSection} aria-labelledby="layout-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p>내 화분 배치</p>
            <h1 id="layout-heading">{space.name}</h1>
            <span>{space.widthCm} × {space.lengthCm}cm / {season.name}</span>
          </div>
          <Link className={styles.seasonLink} href={`/seasons/${season.id}/edit`}>시즌 정보 수정</Link>
        </div>
        {layout ? (
          <GardenGrid crops={gardenCrops} layout={layout} reload={layoutsState.reload} space={space} />
        ) : (
          <GardenGridSetup reload={layoutsState.reload} seasonId={season.id} space={space} />
        )}
      </section>
      <PlanTimeline cropCount={cropCount} placementCount={layout?.placements.length ?? 0} />
      <StartCallout seasonId={season.id} />
      <GardenFooter />
    </main>
  );
}

function GardenHero({ cropCount, placementCount, seasonName }: { cropCount: number; placementCount: number; seasonName: string }) {
  return (
    <section className={styles.hero}>
      <Image alt="햇살이 드는 온실의 화분과 재배 도구" className={styles.heroImage} fill priority sizes="100vw" src="/figma/layout-greenhouse.png" />
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroInner}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/dashboard"><BrandMark /><span>심어봄</span></Link>
          <nav aria-label="재배 메뉴">
            <Link href="/dashboard">내 홈</Link>
            <Link href="/spaces">재배 공간</Link>
            <Link href="/seasons">재배 시즌</Link>
            <Link href="/crops">작물 정보</Link>
          </nav>
          <AuthHeaderMenu />
        </header>
        <div className={styles.heroContent}>
          <p>재배 배치</p>
          <h1>화분 배치와<br />재배 계획</h1>
          <span>{seasonName}에 심을 작물과 간격을 한눈에 조정해 보세요.</span>
        </div>
        <dl className={styles.heroMetrics}>
          <div><dt>작물</dt><dd>{cropCount}<small>종</small></dd></div>
          <div><dt>배치</dt><dd>{placementCount}<small>칸</small></dd></div>
          <div><dt>계획 단계</dt><dd>3<small>개</small></dd></div>
        </dl>
      </div>
    </section>
  );
}

function GardenGridSetup({ seasonId, reload, space }: { seasonId: string; reload: () => Promise<void>; space: GrowingSpace }) {
  const [cellSizeCm, setCellSizeCm] = useState<GridCellSizeCm>(25);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const columns = Math.floor(space.widthCm / cellSizeCm);
  const rows = Math.floor(space.lengthCm / cellSizeCm);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setError("");
    const result = createGardenLayout(seasonId, space.id, space.widthCm, space.lengthCm, cellSizeCm, new Date().toISOString());
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setIsSaving(true);
    try {
      await putGardenLayout(result.layout);
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "격자를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function selectCellSize(value: string) {
    const parsed = Number(value);
    const option = GRID_CELL_SIZE_OPTIONS.find((item) => item === parsed);
    if (option) setCellSizeCm(option);
  }

  return (
    <form className={styles.setupCard} onSubmit={submit}>
      <div>
        <p>첫 배치 만들기</p>
        <h2>화분을 몇 cm 단위로 나눌까요?</h2>
        <span>작은 칸은 세밀하고, 큰 칸은 한눈에 관리하기 쉬워요.</span>
      </div>
      <label className={styles.sizeField}>
        <span>한 칸 크기</span>
        <select onChange={(event) => selectCellSize(event.target.value)} value={cellSizeCm}>
          {GRID_CELL_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} × {size}cm</option>)}
        </select>
      </label>
      <div className={styles.setupPreview}>
        <div><strong>{columns}</strong><span>열</span></div>
        <div><strong>{rows}</strong><span>행</span></div>
        <div><strong>{columns * rows}</strong><span>전체 칸</span></div>
      </div>
      {error && <p className={styles.errorMessage} role="alert">{error}</p>}
      <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? "저장 중" : "배치 격자 만들기"}</button>
    </form>
  );
}

function GardenGrid({ crops, layout, reload, space }: { crops: readonly CropReference[]; layout: GardenLayout; reload: () => Promise<void>; space: GrowingSpace }) {
  const [selectedCropId, setSelectedCropId] = useState(crops[0]?.id ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
  const placementsByCell = new Map(layout.placements.map((placement) => [placement.cellIndex, placement]));
  const selectedCrop = cropsById.get(selectedCropId);
  const outdated = isGardenLayoutOutdated(layout, space);
  const plantCount = calculatePlantCount(layout.placements, crops);

  async function updateCell(cellIndex: number) {
    if (isSaving || !selectedCropId) return;
    setError("");
    setIsSaving(true);
    try {
      const updated = toggleCropPlacement(layout, cellIndex, selectedCropId, crops.map((crop) => crop.id), new Date().toISOString());
      await putGardenLayout(updated);
      await reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "작물을 배치하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function recreateGrid() {
    if (isSaving || !window.confirm("현재 작물 배치를 모두 지우고 격자를 다시 만들까요?")) return;
    setIsSaving(true);
    try {
      await deleteGardenLayout(layout);
      await reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "격자를 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  const gridStyle = { gridTemplateColumns: `repeat(${layout.columns}, var(--control-md))` } as CSSProperties;

  return (
    <>
      {outdated && <p className={styles.warningMessage} role="alert">공간 크기가 변경되었습니다. 정확한 배치를 위해 격자를 다시 만들어 주세요.</p>}
      <div className={styles.editorShell}>
        <aside className={styles.cropLibrary} aria-labelledby="crop-library-title">
          <div className={styles.panelHeading}>
            <p>작물 목록</p>
            <h2 id="crop-library-title">무엇을 심을까요?</h2>
          </div>
          <div className={styles.cropList} role="radiogroup" aria-labelledby="crop-library-title">
            {crops.map((crop) => (
              <label className={`${styles.cropChoice} ${selectedCropId === crop.id ? styles.cropChoiceActive : ""}`} key={crop.id}>
                <input checked={selectedCropId === crop.id} name="crop" onChange={() => setSelectedCropId(crop.id)} type="radio" />
                <span className={styles.cropThumb}><Image alt="" fill sizes="48px" src={CROP_IMAGES[crop.category]} /></span>
                <span><strong>{crop.name}</strong><small>{CATEGORY_LABELS[crop.category]} / {crop.plantSpacingCm}cm</small></span>
                <b aria-hidden="true">+</b>
              </label>
            ))}
          </div>
        </aside>

        <section className={styles.canvasPanel} aria-labelledby="garden-canvas-title">
          <div className={styles.canvasToolbar}>
            <div><p>배치 편집</p><h2 id="garden-canvas-title">{space.name}</h2></div>
            <span>{isSaving ? "저장 중" : "저장됨"}</span>
          </div>
          <div className={styles.gardenScroll}>
            <div className={styles.gardenBed}>
              <div className={styles.gardenCells} style={gridStyle}>
                {Array.from({ length: layout.columns * layout.rows }, (_, cellIndex) => {
                  const placement = placementsByCell.get(cellIndex);
                  const crop = placement ? cropsById.get(placement.cropId) : undefined;
                  const row = Math.floor(cellIndex / layout.columns) + 1;
                  const column = (cellIndex % layout.columns) + 1;
                  return (
                    <button
                      aria-label={`${row}행 ${column}열, ${crop?.name ?? "비어 있음"}`}
                      className={`${styles.gardenCell} ${crop ? styles.plantedCell : ""}`}
                      data-category={crop?.category}
                      disabled={isSaving || !selectedCropId}
                      key={cellIndex}
                      onClick={() => void updateCell(cellIndex)}
                      title={`${row}행 ${column}열, ${crop?.name ?? "비어 있음"}`}
                      type="button"
                    >
                      {crop ? <Image alt="" fill sizes="44px" src={CROP_IMAGES[crop.category]} /> : <span aria-hidden="true">+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={styles.canvasFooter}>
            <p>{layout.columns}열 × {layout.rows}행 / 한 칸 {layout.cellSizeCm}cm</p>
            <button disabled={isSaving} onClick={() => void recreateGrid()} type="button">격자 다시 만들기</button>
          </div>
          {error && <p className={styles.errorMessage} role="alert">{error}</p>}
        </section>

        <aside className={styles.inspector} aria-labelledby="inspector-title">
          <div className={styles.panelHeading}>
            <p>선택 정보</p>
            <h2 id="inspector-title">{selectedCrop?.name ?? "작물을 선택하세요"}</h2>
          </div>
          {selectedCrop ? (
            <>
              <div className={styles.inspectorPhoto}><Image alt={`${selectedCrop.name} 작물 사진`} fill sizes="260px" src={CROP_IMAGES[selectedCrop.category]} /></div>
              <dl className={styles.cropFacts}>
                <div><dt>종류</dt><dd>{CATEGORY_LABELS[selectedCrop.category]}</dd></div>
                <div><dt>권장 간격</dt><dd>{selectedCrop.plantSpacingCm}cm</dd></div>
                <div><dt>심는 시기</dt><dd>{selectedCrop.plantingPeriod.label}</dd></div>
                <div><dt>수확 시기</dt><dd>{selectedCrop.harvestPeriod.label}</dd></div>
              </dl>
              <p className={styles.cropSummary}>{selectedCrop.summary}</p>
            </>
          ) : <p className={styles.emptyMessage}>왼쪽 목록에서 배치할 작물을 선택해 주세요.</p>}
          <div className={styles.countSummary}>
            <div><span>전체 작물</span><strong>{plantCount.totalCount}<small>포기</small></strong></div>
            <div><span>작물 종류</span><strong>{plantCount.cropTypeCount}<small>종</small></strong></div>
          </div>
        </aside>
      </div>
      <p className={styles.editorHelp}>작물을 선택한 다음 빈 칸을 누르세요. 같은 작물이 있는 칸을 다시 누르면 배치에서 제거됩니다.</p>
    </>
  );
}

function PlanTimeline({ cropCount, placementCount }: { cropCount: number; placementCount: number }) {
  const stages = [
    { number: "1", title: "배치", value: `${cropCount}종 선택`, detail: `${placementCount}칸에 작물을 배치했어요.` },
    { number: "2", title: "재배", value: "일정 확인", detail: "심기와 관리 일정을 자동으로 만들어요." },
    { number: "3", title: "수확", value: "기록 남기기", detail: "수확량과 성장 변화를 시즌에 기록해요." },
  ];
  return (
    <section className={styles.timelineSection} aria-labelledby="timeline-title">
      <p>재배 계획 요약</p>
      <h2 id="timeline-title">심기부터 수확까지 이어서 관리해요</h2>
      <ol>
        {stages.map((stage) => (
          <li key={stage.number}>
            <span>{stage.number}</span>
            <div><strong>{stage.title}</strong><b>{stage.value}</b><small>{stage.detail}</small></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StartCallout({ seasonId }: { seasonId: string }) {
  return (
    <section className={styles.callout}>
      <Image alt="햇빛 드는 베란다 텃밭" fill sizes="(max-width: 1160px) 100vw, 1160px" src="/figma/image4.png" />
      <div aria-hidden="true" />
      <div>
        <p>배치가 마음에 드나요?</p>
        <h2>이 배치로 시작할까요?</h2>
        <span>저장된 작물 배치를 기준으로 재배 일정을 만들고 오늘 할 일을 관리할 수 있어요.</span>
      </div>
      <Link href={`/seasons/${seasonId}/tasks`}>재배 일정 확인하기 <span aria-hidden="true">→</span></Link>
    </section>
  );
}

function GardenFooter() {
  return (
    <footer className={styles.footer}>
      <div><BrandMark /><strong>심어봄</strong><p>작은 화분부터 시작하는 나만의 재배 계획</p></div>
      <nav aria-label="하단 메뉴"><Link href="/spaces">재배 공간</Link><Link href="/seasons">재배 시즌</Link><Link href="/crops">작물 정보</Link></nav>
      <div><span>문의</span><a href="mailto:help@simeobom.example">help@simeobom.example</a></div>
      <small>© 2026 심어봄</small>
    </footer>
  );
}

function LayoutStatePage({ status, message }: { status: "loading" | "error"; message?: string }) {
  return (
    <main className={styles.statePage}>
      <Link className={styles.stateBrand} href="/dashboard"><BrandMark /><span>심어봄</span></Link>
      <section aria-live="polite" className={styles.stateCard}>
        <span className={styles.stateLeaf} aria-hidden="true" />
        <p>{status === "loading" ? "재배 배치를 불러오고 있어요" : "재배 배치를 열지 못했어요"}</p>
        <h1>{status === "loading" ? "저장된 화분과 작물 정보를 확인하는 중입니다." : message}</h1>
        {status === "error" && <Link href="/seasons">시즌 목록으로 돌아가기</Link>}
      </section>
    </main>
  );
}
