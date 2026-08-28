import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { TransitionLink } from "@/components/transition-link";
import { START_PATH } from "../landing-config";

/**
 * 랜딩 전용 헤더 — 짙은 녹색 히어로 위에 얹힌다
 *
 * 로고는 develop 의 기존 brand asset(components/brand-mark.tsx)을 그대로 쓴다.
 * 기존 BrandMark 는 이미지만 그리므로 글자는 여기에서 랜딩 타이포로 붙인다.
 */
export function LandingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="lp-shell-wide flex items-center justify-between py-6">
        <Link
          href="/"
          aria-label="심어봄 홈"
          className="inline-flex items-center gap-2.5"
        >
          <BrandMark variant="white" size={30} />
          <span className="brand-wordmark lp-type-section text-white">심어봄</span>
        </Link>

        <nav className="flex items-center gap-7 sm:gap-9">
          <a
            href="#about"
            className="lp-type-body-sm text-white/65 transition-colors hover:text-white"
          >
            서비스 소개
          </a>
          <TransitionLink
            href={START_PATH}
            className="inline-flex h-10 items-center rounded-full bg-white px-5 lp-type-body-sm font-semibold text-lp-forest transition-colors hover:bg-lp-brand-tint"
          >
            시작하기
          </TransitionLink>
        </nav>
      </div>
    </header>
  );
}
