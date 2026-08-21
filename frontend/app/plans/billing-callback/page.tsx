import type { Metadata } from "next";
import { AppPageShell } from "@/components/app-page-shell";
import { BillingCallback } from "@/features/billing/components/billing-callback";

export const metadata: Metadata = {
  title: "구독 처리 중 | 심어봄",
  description: "카드 등록 결과를 확인하고 구독을 완료합니다.",
};

export default async function BillingCallbackPage(props: PageProps<"/plans/billing-callback">) {
  const query = await props.searchParams;
  const authKey = typeof query.authKey === "string" ? query.authKey : null;

  return (
    <AppPageShell
      description="카드 등록 결과를 확인하는 동안 잠시만 기다려 주세요."
      eyebrow="프로 구독"
      heroSize="compact"
      homeHref="/"
      title="구독 처리 중"
    >
      <BillingCallback authKey={authKey} />
    </AppPageShell>
  );
}
