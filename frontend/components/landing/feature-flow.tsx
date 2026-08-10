const steps = [
  {
    number: "01",
    title: "지금 필요한 도움을 찾아요",
    description: "선물 받은 꽃을 살리거나 내 공간에 맞는 식물을 고르는 것부터 시작해요.",
  },
  {
    number: "02",
    title: "내 식물과 공간을 등록해요",
    description: "실내 화분, 베란다와 텃밭을 등록하고 키울 식물과 관리 기간을 연결해요.",
  },
  {
    number: "03",
    title: "오늘 할 일을 이어가요",
    description: "재배 일정과 가까운 알림을 확인하고 관리 기록을 차곡차곡 남겨요.",
  },
];

export function FeatureFlow() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-leaf px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.18em] text-[#bcd3ad]">HOW IT WORKS</p>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-5xl">처음 살리는 순간부터 꾸준한 관리까지</h2>
          <p className="mt-5 text-lg leading-8 text-white/70">한 번 보고 끝나는 정보가 아니라 내 식물의 다음 행동으로 이어집니다.</p>
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
