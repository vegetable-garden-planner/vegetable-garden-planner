import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";

interface AppHeaderProps {
  action?: ReactNode;
  homeHref?: string;
}

const navigation = [
  { label: "내 홈", href: "/dashboard" },
  { label: "공간", href: "/spaces" },
  { label: "시즌", href: "/seasons" },
  { label: "작물 정보", href: "/crops" },
  { label: "무료·프로", href: "/plans" },
];

export function AppHeader({ action, homeHref = "/" }: AppHeaderProps) {
  return (
    <header className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-white/80 bg-white/88 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:px-5">
      <Link className="flex items-center gap-2.5 font-bold tracking-[-0.03em]" href={homeHref}>
        <BrandMark />
        <span className="text-lg text-[var(--color-ink-strong)]">심어봄</span>
      </Link>
      <nav className="app-header-nav order-3 flex w-full gap-1 overflow-x-auto text-sm font-bold text-muted md:order-none md:w-auto" aria-label="사용자 메뉴">
        {navigation.map((item) => (
          <Link className="shrink-0 rounded-full px-3 py-2 transition hover:bg-leaf-soft hover:text-leaf" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        {action}
        <AuthHeaderMenu />
      </div>
    </header>
  );
}
