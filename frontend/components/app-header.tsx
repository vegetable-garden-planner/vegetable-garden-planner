import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";

interface AppHeaderProps {
  action?: ReactNode;
  homeHref?: string;
  variant?: "default" | "overlay";
}

const navigation = [
  { label: "재배 홈", href: "/dashboard" },
  { label: "공간·시즌", href: "/spaces" },
  { label: "작물관리", href: "/crops" },
  { label: "가이드", href: "/start" },
];

export function AppHeader({ action, homeHref = "/", variant = "default" }: AppHeaderProps) {
  return (
    <header className={`app-header ${variant === "overlay" ? "app-header-overlay" : ""}`}>
      <div className="app-header-inner">
        <Link className="app-brand" href={homeHref} aria-label="심어봄 홈">
          <BrandMark variant={variant === "overlay" ? "white" : "color"} />
          <span>심어봄</span>
        </Link>
        <nav className="app-header-nav" aria-label="사용자 메뉴">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="app-header-actions">
          <Link className="app-search-link" href="/crops" aria-label="작물 검색"><span aria-hidden="true" /></Link>
          {action}
          <AuthHeaderMenu />
        </div>
      </div>
    </header>
  );
}
