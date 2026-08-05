"use client";

import Link from "next/link";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

const TYPE_LABELS: Record<GrowingSpace["type"], string> = {
  indoor: "실내 화분",
  balcony: "베란다",
  garden: "마당·텃밭",
};

const SUNLIGHT_LABELS: Record<GrowingSpace["sunlight"], string> = {
  low: "2시간 미만",
  partial: "2~5시간",
  full: "6시간 이상",
};

export function SpaceList() {
  const result = useGrowingSpaces();

  if (result.status === "error") {
    return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{result.message}</p>;
  }

  const { spaces } = result;
  if (spaces.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-leaf/30 bg-white p-8 text-center">
        <h2 className="text-xl font-bold">아직 등록한 공간이 없어요</h2>
        <p className="mt-3 text-muted">작은 화분 자리부터 내 첫 재배 공간으로 등록해 보세요.</p>
        <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/spaces/new">첫 공간 등록하기</Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {spaces.map((space) => (
        <li className="rounded-3xl border border-ink/10 bg-white p-6" key={space.id}>
          <p className="text-sm font-bold text-leaf">{TYPE_LABELS[space.type]}</p>
          <h2 className="mt-2 text-xl font-bold">{space.name}</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted">크기</dt><dd className="mt-1 font-bold">{space.widthCm} × {space.lengthCm}cm</dd></div>
            <div><dt className="text-muted">햇빛</dt><dd className="mt-1 font-bold">{SUNLIGHT_LABELS[space.sunlight]}</dd></div>
            <div className="col-span-2"><dt className="text-muted">지역</dt><dd className="mt-1 font-bold">{space.region}</dd></div>
          </dl>
          <Link className="mt-6 inline-flex rounded-full border border-leaf/25 px-4 py-2 text-sm font-bold text-leaf" href={`/seasons/new?spaceId=${encodeURIComponent(space.id)}`}>이 공간에 시즌 등록</Link>
        </li>
      ))}
    </ul>
  );
}
