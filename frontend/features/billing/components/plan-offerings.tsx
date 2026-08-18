import Link from "next/link";
import {
  getProductOffering,
  isOfferingReady,
  type ProductOffering,
} from "@/features/billing/domain/product-offering";
import styles from "./plan-offerings.module.css";

export function PlanOfferings() {
  return (
    <div className={styles.offerings}>
      <div className={styles.cards}>
        <OfferingCard offering={getProductOffering("free")} />
        <OfferingCard featured offering={getProductOffering("pro")} />
      </div>

      <section aria-labelledby="payment-principle-title" className={styles.principle}>
        <p>현재 개발 원칙</p>
        <h2 id="payment-principle-title">아직 결제는 받지 않습니다</h2>
        <p>
          프로의 핵심인 날씨 연동, 사진 비교, 푸시 알림과 공동 관리는 Laravel 서버와 사용자별 데이터 저장이 필요합니다.
          이 기능이 실제로 동작하고 반복 사용 가치가 검증된 뒤에 결제를 연결합니다.
        </p>
      </section>
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

      {ready
        ? <Link className={`${styles.action} ${styles.actionReady}`} href="/start">무료로 시작하기</Link>
        : <p className={`${styles.action} ${styles.actionPending}`}>서버 기능 구현 후 제공합니다</p>}
    </section>
  );
}
