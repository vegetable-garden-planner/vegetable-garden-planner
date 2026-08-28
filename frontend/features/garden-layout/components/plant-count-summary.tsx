import type { PlantCountSummary as PlantCountSummaryValue } from "../application/calculate-plant-count";

export function PlantCountSummary({
  summary,
}: {
  summary: PlantCountSummaryValue;
}) {
  return (
    <section className="surface-panel mt-5 p-5" aria-labelledby="plant-count-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-leaf">예상 심기 수량</p>
          <h2 className="mt-1 text-2xl font-bold" id="plant-count-title">
            총 {summary.totalCount}포기
          </h2>
        </div>
        <p className="rounded-full bg-leaf-soft px-3 py-1.5 text-sm font-bold text-leaf-dark">
          {summary.cropTypeCount}종
        </p>
      </div>

      {summary.crops.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {summary.crops.map((crop) => (
            <li className="flex items-center justify-between rounded-xl bg-cream px-4 py-3" key={crop.cropId}>
              <span className="font-semibold">{crop.cropName}</span>
              <strong>{crop.count}포기</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-muted">
          격자에 작물을 배치하면 작물별 포기 수를 바로 계산합니다.
        </p>
      )}

      <p className="mt-3 text-xs leading-5 text-muted">
        작물이 배치된 한 칸을 1포기로 계산하고, 저장된 칸 크기와 작물별 권장 간격을 함께 확인합니다.
      </p>
    </section>
  );
}
