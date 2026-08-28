import type { Metadata } from "next";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { encodeNextPath } from "@/features/auth/domain/auth";
import { DiagnosisForm } from "@/features/start-diagnosis/components/diagnosis-form";
import styles from "./start.module.css";

export const metadata: Metadata = {
  title: "재배 계획 만들기 | 심어봄",
  description: "화분과 햇빛 조건을 알려주면 첫 재배 계획을 만들어 드려요.",
};

/**
 * 진단은 로그인한 뒤에 한다.
 *
 * 예전에는 GuestGate로 감싸 로그인 사용자를 대시보드로 되돌려 보냈다.
 * 그래서 (1) 진단을 마치고 가입하면 결과를 계정에 저장할 수 없었고,
 * (2) 이미 가입한 사람은 화분을 하나 더 만들려 해도 진단을 다시 할 수 없었다.
 *
 * 이제 소개 → 로그인 → 진단 순서로 바꾸고, 여기서 만든 결과를
 * 그대로 공간·재배 계획·배치까지 이어서 저장한다.
 */
export default function StartPage() {
  return (
    <main className={styles.page}>
      <AuthGate loginHref={`/login?next=${encodeNextPath("/start")}`}>
        <DiagnosisForm />
      </AuthGate>
    </main>
  );
}
