import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { SeasonForm } from "@/features/growing-season/components/season-form";

export const metadata: Metadata = {
  title: "새 재배 시작 | 심어봄",
  description: "화분과 기간을 정해 새 재배 계획을 만드세요.",
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
    <AuthGate loginHref={`/login?next=${encodeNextPath(returnPath)}`}>
      <AppPageShell
        backHref="/seasons"
        backLabel="내 재배 계획"
        description="재배 계획은 작물 배치와 일정, 기록을 하나로 묶는 기준이 됩니다."
        eyebrow="새 재배 시작"
        heroSize="compact"
        title="이번 재배 기간을 정해 주세요"
        width="full"
      >
        <SeasonForm initialCropId={requestedCropId} initialSpaceId={initialSpaceId} />
      </AppPageShell>
    </AuthGate>
  );
}
