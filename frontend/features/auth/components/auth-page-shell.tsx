import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import styles from "./auth.module.css";

interface AuthPageShellProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function AuthPageShell({
  children,
  description,
  eyebrow,
  title,
}: AuthPageShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.visual} aria-label="심어봄 재배 계획 소개">
          <Image src="/figma/planner-hero.webp" alt="햇살이 드는 창가의 화분과 허브" fill priority sizes="(max-width: 960px) 0px, 48vw" className={styles.visualImage} />
          <div className={styles.visualShade} />
          <div className={styles.visualCopy}>
            <p>작은 화분부터 천천히</p>
            <h2>오늘의 돌봄이<br />내일의 초록이 돼요</h2>
            <p>공간과 계절에 맞는 재배 일정을 만들고 성장의 순간을 차곡차곡 기록하세요.</p>
            <div className={styles.visualStats} aria-label="심어봄 핵심 기능">
              <div><span>공간</span><strong>환경에 맞게</strong></div>
              <div><span>일정</span><strong>놓치지 않게</strong></div>
              <div><span>기록</span><strong>차곡차곡</strong></div>
            </div>
          </div>
        </section>
        <section className={styles.content}>
          <Link className={styles.brand} href="/">
            <BrandMark />
            <span>심어봄</span>
          </Link>
          <div className={styles.heading}>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.formPanel}>{children}</div>
        </section>
      </div>
    </main>
  );
}
