import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SeasonForm } from "@/features/growing-season/components/season-form";

export const metadata: Metadata = {
  title: "시즌 등록 | 심어봄",
  description: "재배 공간에 새로운 시즌과 기간을 등록하세요.",
};

export default async function NewSeasonPage(props: PageProps<"/seasons/new">) {
  const query = await props.searchParams;
  const initialSpaceId = typeof query.spaceId === "string" ? query.spaceId : "";
  const requestedCropId = typeof query.cropId === "string" ? query.cropId : "";
  const returnQuery = new URLSearchParams();
  if (initialSpaceId) returnQuery.set("spaceId", initialSpaceId);
  if (requestedCropId) returnQuery.set("cropId", requestedCropId);
  const returnPath = returnQuery.size > 0
    ? `/seasons/new?${returnQuery.toString()}`
    : "/seasons/new";

  return (
    <AuthGate loginHref={`/login?next=${encodeURIComponent(returnPath)}`}>
      <AppPageShell
        backHref="/seasons"
        backLabel="시즌 목록"
        description="시즌은 작물 배치와 재배 일정, 성장 기록을 하나로 묶는 기준이 됩니다."
        eyebrow="재배 시즌 등록"
        title="이번 재배 기간을 정해 주세요"
        width="medium"
      >
        <section className="surface-panel p-6 sm:p-9">
          <SeasonForm initialCropId={requestedCropId} initialSpaceId={initialSpaceId} />
        </section>
      </AppPageShell>
    </AuthGate>
  );
}
