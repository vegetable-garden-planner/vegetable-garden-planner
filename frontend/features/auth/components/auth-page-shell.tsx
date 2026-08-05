import type { ReactNode } from "react";
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
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link className="inline-flex items-center gap-3 font-bold" href="/">
          <BrandMark />
          <span>심어봄</span>
        </Link>
        <div className="mb-8 mt-12">
          <p className="text-sm font-bold text-leaf">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 leading-7 text-muted">{description}</p>
        </div>
        <section className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
