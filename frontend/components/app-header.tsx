import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";

interface AppHeaderProps {
  action?: ReactNode;
}

const navigation = [
  { label: "내 홈", href: "/dashboard" },
  { label: "공간", href: "/spaces" },
  { label: "시즌", href: "/seasons" },
  { label: "작물 정보", href: "/crops" },
];

export function AppHeader({ action }: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-5">
      <Link className="flex items-center gap-3 font-bold" href="/dashboard">
        <BrandMark />
        <span>심어봄</span>
      </Link>
      <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm font-bold text-muted md:order-none md:w-auto" aria-label="사용자 메뉴">
        {navigation.map((item) => (
          <Link className="shrink-0 rounded-full px-3 py-2 transition hover:bg-white hover:text-leaf" href={item.href} key={item.href}>
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
