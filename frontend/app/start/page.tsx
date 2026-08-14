import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";
import { DiagnosisForm } from "@/features/start-diagnosis/components/diagnosis-form";
import styles from "./start.module.css";

export const metadata: Metadata = {
  title: "시작 진단 | 심어봄",
  description: "내 공간과 생활 조건에 맞는 첫 식물과 시작 방법을 찾아보세요.",
};

export default function StartPage() {
  return (
    <main className={styles.page}>
      <div className={styles.headerShell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/">
            <BrandMark />
            <span>심어봄</span>
          </Link>
          <div className={styles.headerActions}>
            <AuthHeaderMenu />
            <Link className={styles.closeLink} href="/" aria-label="시작 진단 닫기">×</Link>
          </div>
        </header>
      </div>
      <DiagnosisForm />
    </main>
  );
}
