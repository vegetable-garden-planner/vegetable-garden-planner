const steps = [
  {
    number: "01",
    title: "밭 정보를 입력해요",
    description: "가로·세로 크기와 지역, 재배 시작일을 간단하게 설정해요.",
  },
  {
    number: "02",
    title: "작물을 직접 배치해요",
    description: "격자 위에 원하는 작물을 놓고 내 텃밭만의 배치도를 만들어요.",
  },
  {
    number: "03",
    title: "계획을 확인해요",
    description: "예상 수량과 간격·시기 경고, 앞으로의 관리 일정을 확인해요.",
  },
];

export function FeatureFlow() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-leaf px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.18em] text-[#bcd3ad]">HOW IT WORKS</p>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-5xl">복잡한 텃밭 계획을 세 단계로</h2>
          <p className="mt-5 text-lg leading-8 text-white/70">검색하고 계산하는 시간은 줄이고, 직접 기르는 즐거움에 집중하세요.</p>
        </div>

        <ol id="features" className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li className="rounded-3xl border border-white/10 bg-white/[0.07] p-7 backdrop-blur sm:p-8" key={step.number}>
              <span className="text-sm font-bold text-[#bcd3ad]">{step.number}</span>
              <h3 className="mt-8 text-xl font-bold">{step.title}</h3>
              <p className="mt-3 leading-7 text-white/65">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
