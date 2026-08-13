import type { Metadata } from "next";
import Image from "next/image";
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
      <Image
        alt="잎이 우거진 온실 속 재배 화분"
        className={styles.background}
        fill
        priority
        sizes="100vw"
        src="/figma/diagnosis-greenhouse.png"
      />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.shell}>
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
        <DiagnosisForm />
      </div>
    </main>
  );
}
