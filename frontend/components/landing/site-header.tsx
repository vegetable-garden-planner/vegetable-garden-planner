import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";

const navigation = [
  { label: "서비스 소개", href: "#how-it-works" },
  { label: "주요 기능", href: "#features" },
  { label: "작물 정보", href: "#crops" },
];

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-ink/8 bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <a className="flex items-center gap-3 font-bold tracking-[-0.02em]" href="#top" aria-label="심어봄 홈">
          <BrandMark />
          <span className="text-lg">심어봄</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-muted md:flex" aria-label="주요 메뉴">
          {navigation.map((item) => (
            <a className="transition hover:text-leaf" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden cursor-not-allowed rounded-full px-4 py-2 text-sm font-bold text-muted/65 sm:block" title="로그인 기능 준비 중">
            로그인
          </span>
          <Link className="rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white transition hover:bg-leaf-dark" href="/start">
            시작하기
          </Link>
        </div>
      </div>
    </header>
  );
}
