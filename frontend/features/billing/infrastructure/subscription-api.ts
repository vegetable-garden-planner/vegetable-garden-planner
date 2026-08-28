import type { Subscription } from "../domain/subscription.ts";
import { ApiError, apiRequest } from "../../../shared/infrastructure/api-client.ts";

interface SubscriptionResponse { data: Subscription }

export async function getMySubscription(): Promise<Subscription | null> {
  try {
    return (await apiRequest<SubscriptionResponse>("/subscriptions/me")).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function subscribe(authKey: string): Promise<Subscription> {
  const response = await apiRequest<SubscriptionResponse>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ auth_key: authKey }),
  });
  return response.data;
}

export async function cancelSubscription(id: string, version: number): Promise<void> {
  await apiRequest<void>(`/subscriptions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "If-Match": `"${version}"` },
  });
}
