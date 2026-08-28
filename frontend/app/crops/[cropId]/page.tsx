"use client";

import Link from "next/link";
import { use } from "react";
import { AppPageShell } from "@/components/app-page-shell";
import { CropDetail } from "@/features/crop-catalog/components/crop-detail";
import { CROP_CATEGORY_LABELS } from "@/features/crop-catalog/data/crop-labels";
import { useCropCatalog } from "@/features/crop-catalog/hooks/use-crop-catalog";

export default function CropDetailPage(props: PageProps<"/crops/[cropId]">) {
  const { cropId } = use(props.params);
  const catalog = useCropCatalog();

  if (catalog.status === "loading") return <PageMessage message="작물 정보를 불러오고 있습니다." />;
  if (catalog.status === "error") return <PageMessage error message={catalog.message} />;

  const crop = catalog.crops.find((candidate) => candidate.id === cropId);
  if (!crop) return <PageMessage error message="작물 정보를 찾을 수 없습니다." />;

  const source = catalog.sources.find((candidate) => candidate.id === crop.sourceId);

  return (
    <AppPageShell
      backHref="/crops"
      backLabel="식물 목록"
      description={crop.summary}
      eyebrow={`${CROP_CATEGORY_LABELS[crop.category]} · ${crop.familyName}`}
      heroSize="compact"
      title={`${crop.name} 재배 가이드`}
      width="full"
    >
      <CropDetail crop={crop} crops={catalog.crops} source={source} sources={catalog.sources} />
    </AppPageShell>
  );
}

function PageMessage({ error = false, message }: { error?: boolean; message: string }) {
  return (
    <main className="app-page grid place-items-center text-center">
      <div className="surface-panel max-w-md p-8">
        <p className={error ? "font-semibold text-[var(--color-danger)]" : "text-muted"} role={error ? "alert" : "status"}>{message}</p>
        <Link className="primary-action mt-5 px-5 py-3" href="/crops">작물 목록으로 돌아가기</Link>
      </div>
    </main>
  );
}
