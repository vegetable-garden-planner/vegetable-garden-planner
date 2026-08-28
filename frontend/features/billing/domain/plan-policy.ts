export type PlanCode = "free" | "pro";

export interface PlanPolicy {
  code: PlanCode;
  name: string;
  price: number;
  currency: "KRW";
  billingCycle: "monthly";
  active: boolean;
}

export const PLAN_POLICIES: readonly PlanPolicy[] = [
  {
    code: "free",
    name: "무료",
    price: 0,
    currency: "KRW",
    billingCycle: "monthly",
    active: true,
  },
  {
    code: "pro",
    name: "프로",
    price: 4_900,
    currency: "KRW",
    billingCycle: "monthly",
    active: true,
  },
];

export function findPlanPolicy(code: unknown): PlanPolicy | undefined {
  return typeof code === "string"
    ? PLAN_POLICIES.find((plan) => plan.code === code)
    : undefined;
}
