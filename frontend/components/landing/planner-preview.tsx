const gardenCells = [
  { crop: "상추", tone: "bg-[#75a960]", position: "col-span-2 row-span-2" },
  { crop: "토마토", tone: "bg-[#d66551]", position: "col-start-3 row-start-1" },
  { crop: "토마토", tone: "bg-[#d66551]", position: "col-start-4 row-start-1" },
  { crop: "당근", tone: "bg-[#e59b47]", position: "col-span-2 col-start-3 row-span-2 row-start-2" },
  { crop: "바질", tone: "bg-[#4f8b5d]", position: "col-start-1 row-start-3" },
  { crop: "바질", tone: "bg-[#4f8b5d]", position: "col-start-2 row-start-3" },
];

export function PlannerPreview() {
  return (
    <div id="planner" className="relative mx-auto w-full max-w-2xl scroll-mt-24">
      <div className="absolute -left-8 top-12 hidden rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl backdrop-blur sm:block">
        <p className="text-xs font-semibold text-muted">예상 재배 수량</p>
        <p className="mt-1 text-2xl font-bold text-leaf">32포기</p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-paper shadow-[0_30px_80px_rgba(45,65,44,0.16)]">
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold text-muted">나의 첫 번째 텃밭</p>
            <p className="mt-1 font-bold">봄 재배 계획</p>
          </div>
          <div className="rounded-full bg-leaf-soft px-3 py-1.5 text-xs font-bold text-leaf">자동 저장됨</div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[9rem_1fr] sm:p-7">
          <aside className="flex gap-2 overflow-x-auto sm:flex-col" aria-label="선택 가능한 작물">
            {["상추", "토마토", "당근", "바질"].map((crop, index) => (
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-ink/8 bg-white px-3 py-2.5 text-sm font-semibold" key={crop}>
                <span className={`size-3 rounded-full ${["bg-[#75a960]", "bg-[#d66551]", "bg-[#e59b47]", "bg-[#4f8b5d]"][index]}`} />
                {crop}
              </div>
            ))}
          </aside>

          <div className="garden-grid relative aspect-[4/3] overflow-hidden rounded-2xl border-4 border-[#8a684a] p-2 shadow-inner">
            <div className="grid h-full grid-cols-4 grid-rows-3 gap-1.5">
              {gardenCells.map((cell, index) => (
                <div className={`${cell.position} ${cell.tone} flex items-center justify-center rounded-lg border border-white/40 p-1 text-center text-[10px] font-bold text-white shadow-sm sm:text-xs`} key={`${cell.crop}-${index}`}>
                  {cell.crop}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-ink/8 bg-white/70 px-4 py-4 text-center">
          <div>
            <p className="text-[11px] text-muted">밭 크기</p>
            <p className="mt-1 text-sm font-bold">4m × 3m</p>
          </div>
          <div className="border-x border-ink/8">
            <p className="text-[11px] text-muted">선택 작물</p>
            <p className="mt-1 text-sm font-bold">4종</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">배치 상태</p>
            <p className="mt-1 text-sm font-bold text-leaf">적합</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -right-3 rounded-2xl border border-[#f1d7a2] bg-[#fff8e7] p-4 shadow-xl sm:right-6">
        <p className="text-xs font-bold text-[#8b5b18]">간격 검사를 완료했어요</p>
        <p className="mt-1 text-[11px] text-[#98713d]">현재 배치에서 위험 요소가 없어요.</p>
      </div>
    </div>
  );
}
