"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { subscribe } from "@/features/billing/infrastructure/subscription-api";

export function BillingCallback({ authKey }: { authKey: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    () => (authKey ? null : "카드 등록 정보를 확인할 수 없습니다."),
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (!authKey || startedRef.current) return;
    startedRef.current = true;

    void subscribe(authKey)
      .then(() => {
        router.replace("/plans");
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "구독 처리에 실패했습니다.");
      });
  }, [authKey, router]);

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <Link href="/plans">요금제로 돌아가기</Link>
      </div>
    );
  }

  return <p>구독을 처리하고 있습니다…</p>;
}
