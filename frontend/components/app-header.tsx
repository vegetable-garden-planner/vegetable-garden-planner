"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface AppHeaderProps {
  action?: ReactNode;
  variant?: "default" | "overlay";
}

const navigation = [
  { label: "재배 홈", href: "/dashboard" },
  { label: "공간·시즌", href: "/spaces" },
  { label: "작물관리", href: "/crops" },
  { label: "요금제", href: "/plans" },
  { label: "가이드", href: "/start" },
];

export function AppHeader({ action, variant = "default" }: AppHeaderProps) {
  const auth = useAuthSession();
  const homeHref = auth.state.status === "authenticated" ? "/dashboard" : "/start";

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
          {action}
          <AuthHeaderMenu />
        </div>
      </div>
    </header>
  );
}
