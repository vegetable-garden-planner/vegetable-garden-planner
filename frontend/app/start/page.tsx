import type { Metadata } from "next";
import { GuestGate } from "@/features/auth/components/guest-gate";
import { DiagnosisForm } from "@/features/start-diagnosis/components/diagnosis-form";
import styles from "./start.module.css";

export const metadata: Metadata = {
  title: "시작 진단 | 심어봄",
  description: "내 공간과 생활 조건에 맞는 첫 식물과 시작 방법을 찾아보세요.",
};

export default function StartPage() {
  return (
    <main className={styles.page}>
      <GuestGate authenticatedHref="/dashboard">
        <DiagnosisForm />
      </GuestGate>
    </main>
  );
}
