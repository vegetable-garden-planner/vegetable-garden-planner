"use client";

import Link from "next/link";
import { SpaceForm } from "@/features/growing-space/components/space-form";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";

export function SpaceEditor({ spaceId }: { spaceId: string }) {
  const spacesState = useGrowingSpaces();

  if (spacesState.status === "error") {
    return <Message message={spacesState.message} />;
  }

  const space = spacesState.spaces.find((item) => item.id === spaceId);
  if (!space) {
    return <Message message="수정할 재배 공간을 찾을 수 없습니다." />;
  }

  return <SpaceForm initialType={space.type} space={space} />;
}

function Message({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 p-5 text-red-700" role="alert">
      <p className="font-semibold">{message}</p>
      <Link className="mt-4 inline-flex font-bold underline" href="/spaces">공간 목록으로 돌아가기</Link>
    </div>
  );
}
