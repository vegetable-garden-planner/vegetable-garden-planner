"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteGrowingSpaceWithRelations } from "@/features/growing-space/application/delete-growing-space";
import type { GrowingSpace } from "@/features/growing-space/domain/growing-space";
import { useGrowingSeasons } from "@/features/growing-season/hooks/use-growing-seasons";
import { GROWING_SPACES_STORAGE_KEY } from "@/features/growing-space/infrastructure/space-storage";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import { notifyBrowserStorageChange } from "@/shared/infrastructure/browser-storage-events";

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
  const spacesState = useGrowingSpaces();
  const seasonsState = useGrowingSeasons();
  const [actionError, setActionError] = useState("");

  if (spacesState.status === "error") return <ErrorMessage message={spacesState.message} />;
  if (seasonsState.status === "error") return <ErrorMessage message={seasonsState.message} />;

  const { spaces } = spacesState;
  if (spaces.length === 0) return <EmptySpaceList />;

  function removeSpace(space: GrowingSpace) {
    setActionError("");
    if (!window.confirm(`'${space.name}' 공간을 삭제할까요?`)) return;

    try {
      deleteGrowingSpaceWithRelations(window.localStorage, space.id);
      notifyBrowserStorageChange(GROWING_SPACES_STORAGE_KEY);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "공간을 삭제하지 못했습니다.");
    }
  }

  return (
    <div>
      {actionError && <ErrorMessage message={actionError} />}
      <ul className={`grid gap-4 sm:grid-cols-2 ${actionError ? "mt-4" : ""}`}>
        {spaces.map((space) => {
          const seasonCount = seasonsState.seasons.filter(
            (season) => season.spaceId === space.id,
          ).length;
          return (
            <li className="rounded-3xl border border-ink/10 bg-white p-6" key={space.id}>
              <p className="text-sm font-bold text-leaf">{TYPE_LABELS[space.type]}</p>
              <h2 className="mt-2 text-xl font-bold">{space.name}</h2>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted">크기</dt><dd className="mt-1 font-bold">{space.widthCm} × {space.lengthCm}cm</dd></div>
                <div><dt className="text-muted">햇빛</dt><dd className="mt-1 font-bold">{SUNLIGHT_LABELS[space.sunlight]}</dd></div>
                <div><dt className="text-muted">지역</dt><dd className="mt-1 font-bold">{space.region}</dd></div>
                <div><dt className="text-muted">연결 시즌</dt><dd className="mt-1 font-bold">{seasonCount}개</dd></div>
              </dl>
              <div className="mt-6 flex gap-2 border-t border-ink/10 pt-4">
                <Link className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold" href={`/spaces/${space.id}/edit`}>수정</Link>
                <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={() => removeSpace(space)} type="button">삭제</button>
                <Link className="ml-auto rounded-full bg-leaf-soft px-4 py-2 text-sm font-bold text-leaf-dark" href={`/seasons/new?spaceId=${space.id}`}>시즌 추가</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptySpaceList() {
  return (
    <div className="rounded-3xl border border-dashed border-leaf/30 bg-white p-8 text-center">
      <h2 className="text-xl font-bold">아직 등록한 공간이 없어요</h2>
      <p className="mt-3 text-muted">작은 화분 자리부터 내 첫 재배 공간으로 등록해 보세요.</p>
      <Link className="mt-6 inline-flex rounded-full bg-leaf px-5 py-3 font-bold text-white" href="/spaces/new">첫 공간 등록하기</Link>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-2xl bg-red-50 p-5 font-semibold text-red-700" role="alert">{message}</p>;
}
