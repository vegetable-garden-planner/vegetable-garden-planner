"use client";

import Link from "next/link";
import {
  getProductOffering,
  isOfferingReady,
  type ProductOffering,
} from "@/features/billing/domain/product-offering";
import { useSubscription, type SubscriptionState } from "@/features/billing/hooks/use-subscription";
import styles from "./plan-offerings.module.css";

export function PlanOfferings() {
  const { state, subscribe, cancel } = useSubscription();

  return (
    <div className={styles.offerings}>
      <div className={styles.cards}>
        <OfferingCard offering={getProductOffering("free")} />
        <OfferingCard
          featured
          offering={getProductOffering("pro")}
          subscription={{ state, subscribe, cancel }}
        />
      </div>

      <section aria-labelledby="payment-principle-title" className={styles.principle}>
        <p>현재 개발 원칙</p>
        <h2 id="payment-principle-title">결제는 준비됐지만, 프로 기능은 순차적으로 열립니다</h2>
        <p>
          프로의 핵심인 날씨 연동, 사진 비교, 무제한 공유는 아직 개발 중입니다.
          결제·구독·해지 기능만 먼저 준비했고, 각 기능이 실제로 동작하고 검증되는 대로 하나씩 열어 드립니다.
        </p>
      </section>
    </div>
  );
}

interface SubscriptionControls {
  state: SubscriptionState;
  subscribe: () => Promise<void>;
  cancel: () => Promise<void>;
}

function OfferingCard({
  featured = false,
  offering,
  subscription,
}: {
  featured?: boolean;
  offering: ProductOffering;
  subscription?: SubscriptionControls;
}) {
  const ready = isOfferingReady(offering);

  return (
    <section
      aria-label={`${offering.plan.name} 요금제`}
      className={featured ? `${styles.card} ${styles.featured}` : styles.card}
    >
      <div className={styles.cardHead}>
        <div>
          <p>{offering.plan.name}</p>
          <p className={styles.price}>
            {offering.plan.price === 0
              ? "무료"
              : `월 ${offering.plan.price.toLocaleString("ko-KR")}원`}
          </p>
        </div>
        <span className={`${styles.status} ${ready ? styles.statusReady : styles.statusPending}`}>
          {ready ? "지금 이용 가능" : "준비 중"}
        </span>
      </div>

      <p className={styles.summary}>{offering.summary}</p>

      <ul className={styles.benefits}>
        {offering.benefits.map((benefit) => (
          <li key={benefit.key}>
            <span className={styles.benefitHead}>
              <strong>{benefit.title}</strong>
              <span className={`${styles.badge} ${benefit.availability === "available" ? styles.badgeAvailable : styles.badgePending}`}>
                {benefit.availability === "available" ? "지금 제공" : "서버 구현 후 제공"}
              </span>
            </span>
            <p>{benefit.description}</p>
          </li>
        ))}
      </ul>

      {subscription
        ? <SubscriptionAction controls={subscription} />
        : (
            <Link className={`${styles.action} ${styles.actionReady}`} href="/start">무료로 시작하기</Link>
          )}
    </section>
  );
}

function SubscriptionAction({ controls }: { controls: SubscriptionControls }) {
  const { state, subscribe, cancel } = controls;

  if (state.status === "loading") {
    return <p className={`${styles.action} ${styles.actionPending}`}>구독 정보를 불러오는 중…</p>;
  }

  if (state.status === "error") {
    return (
      <div className={styles.subscriptionPanel}>
        <p className={styles.warning}>{state.message}</p>
        <button className={`${styles.action} ${styles.subscribeAction}`} onClick={() => void subscribe()} type="button">
          다시 시도
        </button>
      </div>
    );
  }

  if (state.status === "active" || state.status === "past_due") {
    return (
      <div className={styles.subscriptionPanel}>
        {state.status === "past_due" && <p className={styles.warning}>최근 결제에 실패했어요. 카드 상태를 확인해 주세요.</p>}
        <p className={styles.statusLine}>
          구독 중 · 다음 결제일 {formatDate(state.subscription.currentPeriodEnd)}
        </p>
        <button className={`${styles.action} ${styles.ghostAction}`} onClick={() => void cancel()} type="button">
          구독 해지
        </button>
      </div>
    );
  }

  const label = state.status === "canceled" ? "다시 구독하기" : "프로 구독하기";

  return (
    <button className={`${styles.action} ${styles.subscribeAction}`} onClick={() => void subscribe()} type="button">
      {label}
    </button>
  );
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ko-KR");
}
