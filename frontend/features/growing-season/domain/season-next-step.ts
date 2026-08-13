import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";

export interface SeasonNextStep {
  description: string;
  href: string;
  label: string;
  title: string;
}

export function getSeasonNextStep(
  seasonId: string,
  layout: GardenLayout | undefined,
): SeasonNextStep {
  const layoutHref = `/seasons/${seasonId}/layout`;

  if (!layout) {
    return {
      title: "다음 단계 · 격자 만들기와 작물 배치",
      description: "공간 크기에 맞는 격자를 만든 뒤, 키울 작물을 칸마다 배치해 주세요.",
      href: layoutHref,
      label: "작물 배치 시작하기",
    };
  }

  if (layout.placements.length === 0) {
    return {
      title: "다음 단계 · 심을 작물 정하기",
      description: "만든 격자에서 작물을 선택하고 심을 위치를 눌러 배치를 저장해 주세요.",
      href: layoutHref,
      label: "작물 배치 이어가기",
    };
  }

  return {
    title: "다음 단계 · 작물별 재배 일정 만들기",
    description: "배치한 작물과 시즌 기간을 기준으로 심기와 수확 일정을 만들 수 있어요.",
    href: `/seasons/${seasonId}/tasks`,
    label: "재배 일정 만들기",
  };
}
