export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  planCode: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  version: number;
}
