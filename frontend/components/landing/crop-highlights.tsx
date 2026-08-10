import Link from "next/link";
import { CROP_REFERENCES } from "@/features/crop-catalog/data/crop-references";
import type { CropDifficulty } from "@/features/crop-catalog/domain/crop-reference";

const HIGHLIGHT_COLORS: Readonly<Record<string, string>> = {
  lettuce: "bg-[#7da765]",
  tomato: "bg-[#d96855]",
  "gift-bouquet": "bg-[#b98191]",
  "moth-orchid": "bg-[#8d7aa8]",
};

const DIFFICULTY_LABELS: Record<CropDifficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  challenging: "관리가 필요해요",
};

const crops = CROP_REFERENCES.filter((crop) => crop.id in HIGHLIGHT_COLORS);

export function CropHighlights() {
  return (
    <section id="crops" className="scroll-mt-20 bg-paper px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.18em] text-soil">PLANT GUIDE</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-5xl">채소부터 선물 받은 꽃까지</h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              공식 자료를 검수해 식물별 심는 시기와 간격, 꽃의 빛과 물 관리 기준을 함께 안내해요.
            </p>
          </div>
          <Link className="rounded-full bg-leaf-soft px-4 py-2 text-sm font-bold text-leaf" href="/crops">식물·꽃 13종 보기 →</Link>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {crops.map((crop) => (
            <li className="group rounded-3xl border border-ink/8 bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(45,65,44,0.1)]" key={crop.name}>
              <div className={`${HIGHLIGHT_COLORS[crop.id]} flex aspect-[4/3] items-center justify-center rounded-2xl`}>
                <span className="grid size-20 place-items-center rounded-full border border-white/40 bg-white/20 text-4xl font-bold text-white" aria-hidden="true">
                  {crop.name.slice(0, 1)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 px-1 pb-1 pt-5">
                <div>
                  <h3 className="text-lg font-bold">{crop.name}</h3>
                  <p className="mt-1 text-sm text-muted">{crop.plantingPeriod.label}</p>
                </div>
                <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-leaf">{DIFFICULTY_LABELS[crop.difficulty]}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-20 rounded-[2rem] bg-[#e8e0cc] px-6 py-10 text-center sm:px-10 sm:py-14">
          <p className="text-sm font-bold text-soil">보고 끝내지 말고 내 식물로 이어가세요</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
            시작 방법부터 관리 일정까지 한곳에서
          </h2>
          <Link className="mt-7 inline-flex min-h-13 items-center justify-center rounded-full bg-leaf px-7 py-3 font-bold text-white transition hover:bg-leaf-dark" href="/start">
            시작 진단하기
            <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>

        <footer className="mt-16 flex flex-col gap-4 border-t border-ink/10 pt-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-ink">심어봄</p>
          <p>공식 자료의 일반 기준을 바탕으로 식물의 시작과 관리를 돕는 서비스입니다.</p>
        </footer>
      </div>
    </section>
  );
}
