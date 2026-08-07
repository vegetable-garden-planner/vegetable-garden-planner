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
    <header className="relative z-20 border-b border-ink/8 bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
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
            className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white transition hover:bg-leaf-dark"
          />
        </div>
      </div>
    </header>
  );
}
