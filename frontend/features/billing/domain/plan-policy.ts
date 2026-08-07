export const PLAN_FEATURE_KEYS = [
  "max_gardens",
  "max_seasons",
  "max_members",
  "pdf_export",
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
export type PlanCode = "free" | "pro";

export interface PlanFeaturePolicy {
  enabled: boolean;
  limit: number | null;
}

export interface PlanPolicy {
  code: PlanCode;
  name: string;
  price: number;
  currency: "KRW";
  billingCycle: "monthly";
  active: boolean;
  features: Readonly<Record<PlanFeatureKey, PlanFeaturePolicy>>;
}

export const PLAN_POLICIES: readonly PlanPolicy[] = [
  {
    code: "free",
    name: "무료",
    price: 0,
    currency: "KRW",
    billingCycle: "monthly",
    active: true,
    features: {
      max_gardens: { enabled: true, limit: 1 },
      max_seasons: { enabled: true, limit: 2 },
      max_members: { enabled: true, limit: 1 },
      pdf_export: { enabled: false, limit: null },
    },
  },
  {
    code: "pro",
    name: "프로",
    price: 4_900,
    currency: "KRW",
    billingCycle: "monthly",
    active: true,
    features: {
      max_gardens: { enabled: true, limit: null },
      max_seasons: { enabled: true, limit: null },
      max_members: { enabled: true, limit: 5 },
      pdf_export: { enabled: true, limit: null },
    },
  },
];

export type PlanLimitDecisionCode =
  | "allowed"
  | "plan-inactive"
  | "feature-disabled"
  | "limit-exceeded";

export interface PlanLimitDecision {
  allowed: boolean;
  code: PlanLimitDecisionCode;
  featureKey: PlanFeatureKey;
  limit: number | null;
  remaining: number | null;
}

export function findPlanPolicy(code: unknown): PlanPolicy | undefined {
  return typeof code === "string"
    ? PLAN_POLICIES.find((plan) => plan.code === code)
    : undefined;
}

export function evaluatePlanLimit(
  plan: PlanPolicy,
  featureKey: PlanFeatureKey,
  currentUsage: number,
  requestedAmount = 1,
): PlanLimitDecision {
  assertNonNegativeInteger(currentUsage, "현재 사용량");
  assertPositiveInteger(requestedAmount, "요청량");

  const feature = plan.features[featureKey];
  if (!plan.active) {
    return denied("plan-inactive", featureKey, feature.limit, null);
  }
  if (!feature.enabled) {
    return denied("feature-disabled", featureKey, feature.limit, 0);
  }
  if (feature.limit === null) {
    return allowed(featureKey, null, null);
  }

  const remaining = Math.max(0, feature.limit - currentUsage);
  return requestedAmount <= remaining
    ? allowed(featureKey, feature.limit, remaining - requestedAmount)
    : denied("limit-exceeded", featureKey, feature.limit, remaining);
}

function allowed(
  featureKey: PlanFeatureKey,
  limit: number | null,
  remaining: number | null,
): PlanLimitDecision {
  return { allowed: true, code: "allowed", featureKey, limit, remaining };
}

function denied(
  code: Exclude<PlanLimitDecisionCode, "allowed">,
  featureKey: PlanFeatureKey,
  limit: number | null,
  remaining: number | null,
): PlanLimitDecision {
  return { allowed: false, code, featureKey, limit, remaining };
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label}은 0 이상의 정수여야 합니다.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${label}은 1 이상의 정수여야 합니다.`);
  }
}
