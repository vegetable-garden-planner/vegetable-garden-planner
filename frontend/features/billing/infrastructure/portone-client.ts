import { requestIssueBillingKey } from "@portone/browser-sdk/v2";

export interface IssueBillingKeyParams {
  userId: string;
  email: string;
  nickname: string;
}

export async function issueBillingKey({ userId, email, nickname }: IssueBillingKeyParams): Promise<string> {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
  if (!storeId || !channelKey) {
    throw new Error("결제 설정(포트원 storeId/channelKey)이 되어 있지 않습니다.");
  }

  const response = await requestIssueBillingKey({
    storeId,
    channelKey,
    billingKeyMethod: "CARD",
    issueId: `${userId}-${Date.now()}`,
    issueName: "심어봄 프로 요금제 카드 등록",
    customer: { customerId: userId, fullName: nickname, email },
  });

  if (!response) throw new Error("카드 등록이 완료되지 않았습니다.");
  if (response.code) throw new Error(response.message ?? "카드 등록에 실패했습니다.");

  return response.billingKey;
}
