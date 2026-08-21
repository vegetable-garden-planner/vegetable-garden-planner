"use client";

import { useCallback, useEffect, useState } from "react";
import { toPushSubscriptionPayload, urlBase64ToUint8Array } from "@/features/notifications/domain/push-subscription";
import { subscribePush, unsubscribePush } from "@/features/notifications/infrastructure/push-notifications-api";

export type PushSubscriptionState =
  | { status: "unsupported" }
  | { status: "checking" }
  | { status: "subscribed" }
  | { status: "unsubscribed" }
  | { status: "error"; message: string };

export interface UsePushSubscriptionResult {
  state: PushSubscriptionState;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [state, setState] = useState<PushSubscriptionState>(
    () => (isPushSupported() ? { status: "checking" } : { status: "unsupported" }),
  );

  useEffect(() => {
    if (!isPushSupported()) return;
    let active = true;

    void navigator.serviceWorker.register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (active) setState({ status: subscription ? "subscribed" : "unsubscribed" });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: toMessage(error) });
      });

    return () => { active = false; };
  }, []);

  const subscribe = useCallback(async () => {
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("푸시 알림 설정(VAPID 공개키)이 되어 있지 않습니다.");

      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("알림 권한이 허용되지 않았습니다.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribePush(toPushSubscriptionPayload(subscription));
      setState({ status: "subscribed" });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribePush(subscription.endpoint);
      }
      setState({ status: "unsubscribed" });
    } catch (error) {
      setState({ status: "error", message: toMessage(error) });
    }
  }, []);

  return { state, subscribe, unsubscribe };
}

function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "푸시 알림 설정을 처리하지 못했습니다.";
}
