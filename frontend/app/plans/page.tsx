import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/site-header";
import {
  getProductOffering,
  isOfferingReady,
  type ProductOffering,
} from "@/features/billing/domain/product-offering";

export const metadata: Metadata = {
  title: "무료·프로 기능 | 심어봄",
  description: "심어봄이 무료로 제공하는 식물 관리 기능과 앞으로 제공할 프로 자동 관리 기능을 확인하세요.",
};

const freeOffering = getProductOffering("free");
const proOffering = getProductOffering("pro");

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_0%,var(--color-primary-soft),transparent_32rem),linear-gradient(180deg,var(--color-page),var(--color-surface))] pt-1 text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <section className="mx-auto max-w-3xl text-center">
          <p className="page-kicker">심어봄의 이용 방식</p>
          <h1 className="mt-4 text-balance text-4xl font-bold tracking-[-0.045em] text-[var(--color-ink-strong)] sm:text-6xl">
            정보는 무료로,<br className="hidden sm:block" /> 반복 관리는 더 똑똑하게
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
            꽃을 살리고 식물을 시작하는 데 필요한 정보는 무료로 제공합니다.
            프로는 날씨와 상태를 반영해 사용자가 놓치기 쉬운 관리를 먼저 챙겨 주는 요금제로 준비합니다.
          </p>
        </section>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <OfferingCard offering={freeOffering} />
          <OfferingCard offering={proOffering} featured />
        </div>

        <section className="surface-panel mt-10 p-6 sm:p-8" aria-labelledby="payment-principle-title">
          <p className="text-sm font-bold text-leaf">현재 개발 원칙</p>
          <h2 className="mt-2 text-2xl font-bold" id="payment-principle-title">아직 결제는 받지 않습니다</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted">
            프로의 핵심인 날씨 연동, 사진 비교, 푸시 알림과 공동 관리는 Laravel 서버와 사용자별 데이터 저장이 필요합니다.
            이 기능이 실제로 동작하고 반복 사용 가치가 검증된 뒤 결제를 연결합니다.
          </p>
        </section>
      </main>
    </div>
  );
}

function OfferingCard({
  featured = false,
  offering,
}: {
  featured?: boolean;
  offering: ProductOffering;
}) {
  const ready = isOfferingReady(offering);
  return (
    <section className={`rounded-[2rem] border p-7 sm:p-9 ${featured ? "border-leaf bg-[linear-gradient(145deg,var(--color-ink-strong),var(--color-primary-hover))] text-white shadow-[var(--shadow-md)]" : "border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-bold ${featured ? "text-[var(--color-accent)]" : "text-leaf"}`}>{offering.plan.name}</p>
          <p className="mt-2 text-3xl font-bold">
            {offering.plan.price === 0 ? "무료" : `월 ${offering.plan.price.toLocaleString("ko-KR")}원`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ready ? "bg-leaf-soft text-leaf-dark" : "bg-white/10 text-white"}`}>
          {ready ? "지금 이용 가능" : "준비 중"}
        </span>
      </div>
      <p className={`mt-4 leading-7 ${featured ? "text-white/70" : "text-muted"}`}>{offering.summary}</p>
      <ul className="mt-7 space-y-5">
        {offering.benefits.map((benefit) => (
          <li className="flex gap-3" key={benefit.key}>
            <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${benefit.availability === "available" ? "bg-leaf-soft text-leaf-dark" : "bg-white/10 text-[var(--color-accent)]"}`} aria-hidden="true">
              {benefit.availability === "available" ? "✓" : "→"}
            </span>
            <div>
              <p className="font-bold">{benefit.title}</p>
              <p className={`mt-1 text-sm leading-6 ${featured ? "text-white/65" : "text-muted"}`}>{benefit.description}</p>
            </div>
          </li>
        ))}
      </ul>
      {ready ? (
        <Link className="primary-action mt-8 w-full px-5 py-3" href="/start">무료로 시작하기</Link>
      ) : (
        <button className="mt-8 w-full cursor-not-allowed rounded-full bg-white/10 px-5 py-3 font-bold text-white/60" disabled type="button">Laravel 연동 후 제공</button>
      )}
    </section>
  );
}
