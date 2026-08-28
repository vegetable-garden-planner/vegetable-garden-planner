"use client";

import Link from "next/link";
import { SpaceForm } from "@/features/growing-space/components/space-form";
import { useGrowingSpaces } from "@/features/growing-space/hooks/use-growing-spaces";
import styles from "@/features/growing-space/components/growing-space.module.css";

export function SpaceEditor({ spaceId }: { spaceId: string }) {
  const spacesState = useGrowingSpaces();

  if (spacesState.status === "loading") {
    return <p className="surface-panel p-5 text-muted" role="status">공간 정보를 불러오고 있습니다.</p>;
  }

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
    <div className={styles.errorMessage} role="alert">
      <p>{message}</p>
      <Link href="/spaces">공간 목록으로 돌아가기 →</Link>
    </div>
  );
}
