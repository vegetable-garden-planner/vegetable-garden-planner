"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import {
  getGrowingSpacesSnapshot,
  parseGrowingSpacesSnapshot,
} from "@/features/growing-space/infrastructure/space-storage";

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
  const snapshot = useSyncExternalStore(
    subscribeToStorage,
    () => getGrowingSpacesSnapshot(window.localStorage),
    getEmptySnapshot,
  );
  const result = useMemo(() => {
    try {
      return { spaces: parseGrowingSpacesSnapshot(snapshot), error: "" };
    } catch (loadError) {
      return {
        spaces: [],
        error: loadError instanceof Error ? loadError.message : "공간 목록을 불러오지 못했습니다.",
      };
    }
  }, [snapshot]);

  if (result.error) {
    return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{result.error}</p>;
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
        </li>
      ))}
    </ul>
  );
}

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getEmptySnapshot() {
  return "";
}
