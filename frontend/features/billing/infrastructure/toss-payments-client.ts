import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

export interface RequestBillingAuthParams {
  customerKey: string;
  customerName: string;
  customerEmail: string;
}

export async function requestBillingAuth({ customerKey, customerName, customerEmail }: RequestBillingAuthParams): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY;
  if (!clientKey) {
    throw new Error("결제 설정(토스페이먼츠 clientKey)이 되어 있지 않습니다.");
  }

  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey });

  await payment.requestBillingAuth({
    method: "CARD",
    successUrl: `${window.location.origin}/plans/billing-callback`,
    failUrl: `${window.location.origin}/plans?billing=failed`,
    customerName,
    customerEmail,
  });
}
