import Link from "next/link";
import type { GrowingSeasonStatus } from "@/features/growing-season/domain/growing-season";
import type { RegisteredPlantSummary } from "@/features/dashboard/domain/registered-plant-summary";
import { SpaceMemoPanel } from "@/features/space-memo/components/space-memo-panel";

const STATUS_LABELS: Readonly<Record<GrowingSeasonStatus, string>> = {
  active: "관리 중",
  planned: "시작 예정",
  completed: "관리 종료",
};

export function RegisteredPlantList({
  plants,
}: {
  plants: readonly RegisteredPlantSummary[];
}) {
  return (
    <section className="surface-panel mt-10 p-6" aria-labelledby="registered-plants-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-leaf">계속 돌보기</p>
          <h2 className="mt-1 text-xl font-bold" id="registered-plants-title">내가 관리하는 식물</h2>
        </div>
        <Link className="inline-flex items-center rounded-full border border-leaf px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf-soft" href="/crops">식물 더 등록하기</Link>
      </div>

      {plants.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-cream p-5">
          <p className="font-bold">아직 등록한 식물이 없어요</p>
          <p className="mt-2 text-sm leading-6 text-muted">식물 상세 화면에서 키우기 시작을 누르면 내 홈에서 관리 흐름을 이어갈 수 있습니다.</p>
          <Link className="mt-4 inline-flex rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white" href="/crops">식물 찾아보기</Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {plants.map((plant) => (
            <li className="rounded-2xl border border-ink/10 p-5" key={plant.seasonId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-leaf">
                    {STATUS_LABELS[plant.status]}
                    {plant.needsAttention && <span className="ml-1 text-[var(--color-danger)]" aria-label="확인이 필요해요" role="img">!</span>}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">{plant.cropName}</h3>
                  <p className="mt-1 text-sm text-muted">{plant.spaceName} · {plant.seasonName} · {plant.startDate} 시작</p>
                </div>
                {plant.cropHref && <Link className="shrink-0 text-sm font-bold text-leaf underline" href={plant.cropHref}>관리법</Link>}
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{plant.careHint}</p>
              {plant.nextTaskTitle && <p className="mt-2 text-sm font-bold text-ink">다음 할 일: {plant.nextTaskTitle}</p>}
              {plant.latestRecordNote && <p className="mt-1 text-sm text-muted">최근 기록: {plant.latestRecordNote}</p>}
              <Link className="mt-4 inline-flex text-sm font-bold text-ink" href="/seasons">
                관리 기간 보기 <span className="ml-1 text-leaf" aria-hidden="true">→</span>
              </Link>
              <SpaceMemoPanel spaceId={plant.spaceId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
