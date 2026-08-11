import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SessionAwareLink } from "@/components/session-aware-link";
import { AuthHeaderMenu } from "@/features/auth/components/auth-header-menu";

const navigation = [
  { label: "서비스 소개", href: "/#how-it-works" },
  { label: "주요 기능", href: "/#features" },
  { label: "작물 정보", href: "/crops" },
  { label: "무료·프로", href: "/plans" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-4 z-40 mx-4 rounded-[1.4rem] border border-white/80 bg-white/88 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:mx-6 lg:mx-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3 font-bold tracking-[-0.02em]" href="/" aria-label="심어봄 홈">
          <BrandMark />
          <span className="text-lg">심어봄</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-muted md:flex" aria-label="주요 메뉴">
          {navigation.map((item) => (
            <Link className="transition hover:text-leaf" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthHeaderMenu />
          <SessionAwareLink
            anonymousHref="/start"
            anonymousLabel="시작하기"
            authenticatedHref="/dashboard"
            authenticatedLabel="내 텃밭"
            className="primary-action px-4 py-2.5 text-sm"
          />
        </div>
      </div>
    </header>
  );
}
