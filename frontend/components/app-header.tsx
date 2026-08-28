"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandMark } from "@/components/brand-mark";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import styles from "./app-header.module.css";

interface AppHeaderProps {
  action?: ReactNode;
  variant?: "default" | "overlay";
}

/**
 * 헤더는 브랜드와 계정만 담고, 기능 탐색은 사이드바가 맡는다.
 * 메뉴를 나열하면 다섯 자리에 못 담고, 중요한 기능이 계속 밀려났다.
 */
export function AppHeader({ action, variant = "default" }: AppHeaderProps) {
  const auth = useAuthSession();
  const homeHref = auth.state.status === "authenticated" ? "/dashboard" : "/start";

  return (
    <header className={`app-header ${variant === "overlay" ? "app-header-overlay" : ""}`}>
      <div className="app-header-inner">
        <div className={styles.lead}>
          <AppSidebar variant={variant} />
          <Link className="app-brand" href={homeHref} aria-label="심어봄 홈">
            <BrandMark variant={variant === "overlay" ? "white" : "color"} />
            <span>심어봄</span>
          </Link>
        </div>
        <div />
        <div className="app-header-actions">
          {action}
          <AuthHeaderMenu />
        </div>
      </div>
    </header>
  );
}
