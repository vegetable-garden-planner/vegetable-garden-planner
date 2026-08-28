import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { SpaceForm } from "@/features/growing-space/components/space-form";
import { isGrowingSpaceType } from "@/shared/domain/growing-environment";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";

export const metadata: Metadata = {
  title: "재배 공간 등록 | 심어봄",
  description: "실내 화분, 베란다 또는 텃밭 공간의 환경과 크기를 등록하세요.",
};

export default async function NewSpacePage(props: PageProps<"/spaces/new">) {
  const query = await props.searchParams;
  const requestedType = query.type;
  const initialType = typeof requestedType === "string" && isGrowingSpaceType(requestedType)
    ? requestedType
    : "indoor";
  const skipDiagnosis = query.skipDiagnosis === "1";
  const returnPath = `/spaces/new?type=${initialType}`;

  return (
    <AuthGate loginHref={`/login?next=${encodeNextPath(returnPath)}`}>
      <AppPageShell
        backHref="/spaces"
        backLabel="내 공간 목록"
        description="등록한 공간은 내 계정에 저장되어 다른 기기에서도 이어서 관리할 수 있습니다."
        eyebrow="재배 공간 등록"
        heroSize="compact"
        title="식물을 키울 공간을 알려주세요"
        width="full"
      >
        <SpaceForm initialType={initialType} skipDiagnosis={skipDiagnosis} />
      </AppPageShell>
    </AuthGate>
  );
}
