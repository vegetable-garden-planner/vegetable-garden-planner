"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import type { Subscription } from "@/features/billing/domain/subscription";
import { issueBillingKey } from "@/features/billing/infrastructure/portone-client";
import { cancelSubscription, getMySubscription, subscribe as subscribeRequest } from "@/features/billing/infrastructure/subscription-api";

export type SubscriptionState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "active"; subscription: Subscription }
  | { status: "past_due"; subscription: Subscription }
  | { status: "canceled"; subscription: Subscription }
  | { status: "error"; message: string };

export interface UseSubscriptionResult {
  state: SubscriptionState;
  subscribe: () => Promise<void>;
  cancel: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const { state: authState } = useAuthSession();
  const [remoteState, setRemoteState] = useState<SubscriptionState>({ status: "loading" });

  useEffect(() => {
    if (authState.status !== "authenticated") return;
    let active = true;

    void getMySubscription()
      .then((subscription) => {
        if (active) setRemoteState(toState(subscription));
      })
      .catch((error: unknown) => {
        if (active) setRemoteState({ status: "error", message: toMessage(error) });
      });

    return () => { active = false; };
  }, [authState.status]);

  const subscribeAction = useCallback(async () => {
    if (authState.status !== "authenticated") return;
    try {
      const billingKey = await issueBillingKey({
        userId: authState.user.id,
        email: authState.user.email,
        nickname: authState.user.nickname,
      });
      const subscription = await subscribeRequest(billingKey);
      setRemoteState(toState(subscription));
    } catch (error) {
      setRemoteState({ status: "error", message: toMessage(error) });
    }
  }, [authState]);

  const cancelAction = useCallback(async () => {
    if (remoteState.status !== "active" && remoteState.status !== "past_due") return;
    try {
      await cancelSubscription(remoteState.subscription.id, remoteState.subscription.version);
      const subscription = await getMySubscription();
      setRemoteState(toState(subscription));
    } catch (error) {
      setRemoteState({ status: "error", message: toMessage(error) });
    }
  }, [remoteState]);

  const state: SubscriptionState = authState.status === "authenticated"
    ? remoteState
    : authState.status === "loading" ? { status: "loading" } : { status: "none" };

  return { state, subscribe: subscribeAction, cancel: cancelAction };
}

function toState(subscription: Subscription | null): SubscriptionState {
  if (!subscription) return { status: "none" };
  return { status: subscription.status, subscription };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "구독 정보를 처리하지 못했습니다.";
}
