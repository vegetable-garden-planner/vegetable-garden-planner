import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import styles from "./auth.module.css";

interface AuthCardShellProps {
  children: ReactNode;
  /** 카드 아래 제목 (예: "Log in") */
  title: string;
  /** 제목 아래 안내 문구 (예: "아직 회원이 아니신가요?") */
  switchText: string;
  /** 안내 문구 옆 링크 라벨 (예: "Sign up") */
  switchLabel: string;
  switchHref: string;
}

export function AuthCardShell({
  children,
  switchHref,
  switchLabel,
  switchText,
  title,
}: AuthCardShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <Image
          alt=""
          className={styles.backdropImage}
          fill
          priority
          sizes="100vw"
          src="/figma/image3.webp"
        />
      </div>

      <section className={styles.card}>
        <Link aria-label="홈으로 돌아가기" className={styles.close} href="/">
          <span aria-hidden="true">×</span>
        </Link>

        <Link aria-label="심어봄 홈" className={styles.cardBrand} href="/">
          <BrandMark />
        </Link>

        <h1 className={styles.cardTitle}>{title}</h1>
        <p className={styles.cardSwitch}>
          {switchText} <Link href={switchHref}>{switchLabel}</Link>
        </p>

        {children}
      </section>
    </main>
  );
}
