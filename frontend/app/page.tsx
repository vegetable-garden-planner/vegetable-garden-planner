import { FeatureFlow } from "@/components/landing/feature-flow";
import { CropHighlights } from "@/components/landing/crop-highlights";
import { PlannerPreview } from "@/components/landing/planner-preview";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-cream text-ink">
      <SiteHeader />

      <main>
        <section className="relative isolate px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-20 lg:px-12 lg:pt-24">
          <div className="hero-glow" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="relative z-10 max-w-2xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-leaf/15 bg-white/70 px-4 py-2 text-sm font-semibold text-leaf shadow-sm backdrop-blur">
                <span aria-hidden="true">●</span>
                초보자를 위한 한국형 텃밭 계획 도구
              </p>
              <h1 className="text-balance text-4xl font-bold leading-[1.18] tracking-[-0.045em] sm:text-6xl lg:text-[4.6rem]">
                내 텃밭에 꼭 맞는
                <span className="block text-leaf">재배 계획을 한눈에</span>
              </h1>
              <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-muted sm:text-xl sm:leading-9">
                밭 크기와 심고 싶은 작물을 알려주세요. 배치 가능한 수량부터
                간격 경고, 재배 일정까지 한 번에 계획해 드려요.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  className="inline-flex min-h-13 items-center justify-center rounded-full bg-leaf px-7 py-3 font-bold text-white shadow-[0_12px_30px_rgba(45,91,54,0.22)] transition hover:-translate-y-0.5 hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
                  href="#planner"
                >
                  내 텃밭 계획하기
                  <span className="ml-2" aria-hidden="true">→</span>
                </a>
                <a
                  className="inline-flex min-h-13 items-center justify-center rounded-full border border-ink/10 bg-white/70 px-7 py-3 font-bold text-ink transition hover:border-leaf/30 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
                  href="#how-it-works"
                >
                  어떻게 작동하나요?
                </a>
              </div>
              <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-ink/10 pt-6">
                <div>
                  <dt className="text-sm text-muted">대표 작물</dt>
                  <dd className="mt-1 text-lg font-bold">10종부터</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">계획 방식</dt>
                  <dd className="mt-1 text-lg font-bold">반자동 배치</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">기준 데이터</dt>
                  <dd className="mt-1 text-lg font-bold">국내 공식 자료</dd>
                </div>
              </dl>
            </div>

            <PlannerPreview />
          </div>
        </section>

        <FeatureFlow />
        <CropHighlights />
      </main>
    </div>
  );
}
