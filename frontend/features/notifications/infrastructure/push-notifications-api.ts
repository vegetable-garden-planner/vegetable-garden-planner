import type { PushSubscriptionPayload } from "../domain/push-subscription.ts";
import { apiRequest } from "../../../shared/infrastructure/api-client.ts";

export async function subscribePush(payload: PushSubscriptionPayload): Promise<void> {
  await apiRequest<void>("/push-subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await apiRequest<void>("/push-subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
