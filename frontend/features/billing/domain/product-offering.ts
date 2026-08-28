import {
  findPlanPolicy,
  type PlanCode,
  type PlanPolicy,
} from "./plan-policy.ts";

export type ProductBenefitAvailability = "available" | "requires-backend";

export interface ProductBenefit {
  key: string;
  title: string;
  description: string;
  availability: ProductBenefitAvailability;
}

export interface ProductOffering {
  plan: PlanPolicy;
  summary: string;
  benefits: readonly ProductBenefit[];
}

const BENEFITS: Readonly<Record<PlanCode, readonly ProductBenefit[]>> = {
  free: [
    {
      key: "bouquet-rescue",
      title: "선물 받은 꽃 응급 관리",
      description: "받은 첫날 손질부터 물과 자리 관리까지 바로 확인합니다.",
      availability: "available",
    },
    {
      key: "plant-guide",
      title: "기본 식물·꽃 정보",
      description: "심는 시기와 간격, 빛과 물 관리 기준을 확인합니다.",
      availability: "available",
    },
    {
      key: "basic-care-plan",
      title: "기본 재배 계획과 앱 내부 알림",
      description: "공간과 시즌을 등록하고 일정이 가까워지면 내 홈에서 확인합니다.",
      availability: "available",
    },
  ],
  pro: [
    {
      key: "adaptive-schedule",
      title: "날씨·지역·생육 상태별 일정 조정",
      description: "고정된 날짜가 아니라 지금 환경에 맞춰 관리 시점을 다시 계산합니다.",
      availability: "requires-backend",
    },
    {
      key: "photo-health-check",
      title: "사진 변화 비교와 이상 징후 안내",
      description: "기록한 사진의 변화를 비교하고 확인할 증상과 대응 순서를 제안합니다.",
      availability: "requires-backend",
    },
    {
      key: "unlimited-sharing",
      title: "무제한 식물과 가족 공동 관리",
      description: "여러 공간과 식물을 등록하고 가족과 같은 관리 기록을 공유합니다.",
      availability: "requires-backend",
    },
    {
      key: "push-report",
      title: "푸시 알림과 재배 리포트",
      description: "앱을 열지 않아도 할 일을 받고 시즌별 관리 결과를 정리합니다.",
      availability: "requires-backend",
    },
  ],
};

const SUMMARIES: Readonly<Record<PlanCode, string>> = {
  free: "처음 식물을 살리고 키우는 데 필요한 핵심 기능",
  pro: "놓치기 쉬운 관리를 환경에 맞춰 먼저 챙겨 주는 기능",
};

export function getProductOffering(code: PlanCode): ProductOffering {
  const plan = findPlanPolicy(code);
  if (!plan) throw new Error(`요금제 정책을 찾을 수 없습니다: ${code}`);

  return { plan, summary: SUMMARIES[code], benefits: BENEFITS[code] };
}

export function isOfferingReady(offering: ProductOffering) {
  return offering.plan.active
    && offering.benefits.every((benefit) => benefit.availability === "available");
}
