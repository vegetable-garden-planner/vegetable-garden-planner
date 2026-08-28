import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { SpaceEditor } from "@/features/growing-space/components/space-editor";

export const metadata: Metadata = {
  title: "재배 공간 수정 | 심어봄",
  description: "등록한 재배 공간 정보를 수정하세요.",
};

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const loginHref = `/login?next=${encodeNextPath(`/spaces/${spaceId}/edit`)}`;

  return (
    <AuthGate loginHref={loginHref}>
      <AppPageShell
        backHref="/spaces"
        backLabel="공간 목록"
        description="공간의 햇빛과 크기가 달라졌다면 현재 환경에 맞게 정보를 갱신해 주세요."
        eyebrow="재배 공간 관리"
        heroSize="compact"
        title="공간 정보를 수정해요"
        width="full"
      >
        <SpaceEditor spaceId={spaceId} />
      </AppPageShell>
    </AuthGate>
  );
}
