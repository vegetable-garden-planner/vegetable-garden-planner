import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

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
    <main className="min-h-screen bg-[var(--color-surface)] p-4 text-ink sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[var(--shadow-md)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-full overflow-hidden lg:block" aria-label="심어봄 소개 이미지">
          <Image src="/figma/image2.png" alt="햇살이 드는 온실의 작은 텃밭" fill priority sizes="55vw" className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,33,24,0.16),rgba(11,33,24,0.82))]" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <p className="text-sm font-bold text-[var(--color-accent)]">작은 화분부터 천천히</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em]">오늘의 돌봄이<br />내일의 초록이 돼요</h2>
            <p className="mt-5 max-w-md leading-7 text-white/75">공간과 계절에 맞는 재배 일정을 만들고 성장의 순간을 차곡차곡 기록하세요.</p>
          </div>
        </section>
        <section className="flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
          <Link className="inline-flex items-center gap-2.5 self-start font-bold tracking-[-0.03em]" href="/">
            <BrandMark />
            <span className="text-lg">심어봄</span>
          </Link>
          <div className="mb-8 mt-14">
            <p className="page-kicker">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-[var(--color-ink-strong)]">{title}</h1>
            <p className="mt-4 leading-7 text-muted">{description}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-6 sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
