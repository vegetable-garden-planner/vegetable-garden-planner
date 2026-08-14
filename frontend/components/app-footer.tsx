import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const links = [
  { label: "재배 홈", href: "/dashboard" },
  { label: "재배 공간", href: "/spaces" },
  { label: "재배 시즌", href: "/seasons" },
  { label: "작물 정보", href: "/crops" },
];

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div>
          <Link className="app-footer-brand" href="/"><BrandMark /><span>심어봄</span></Link>
          <p>작은 공간에서 시작하는 나만의 재배 계획</p>
        </div>
        <nav aria-label="푸터 메뉴">
          {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </nav>
        <p className="app-footer-copy">© 2026 심어봄</p>
      </div>
    </footer>
  );
}
