import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import type { GrowingSeason } from "./growing-season.ts";
import type { GrowingSpaceType } from "../../../shared/domain/growing-environment.ts";

export interface SeasonNextStep {
  description: string;
  href: string;
  label: string;
  title: string;
}

export function getSeasonNextStep(
  season: Pick<GrowingSeason, "id" | "featuredCropId">,
  spaceType: GrowingSpaceType,
  layout: GardenLayout | undefined,
  hasContainerPlacement = false,
): SeasonNextStep {
  if (spaceType !== "garden") {
    if (!season.featuredCropId && !hasContainerPlacement) {
      return {
        title: "다음 단계 · 화분 작물 배치하기",
        description: "화분마다 키울 작물과 수량을 추가하면 재배 일정을 만들 수 있어요.",
        href: `/seasons/${season.id}/placements`,
        label: "화분 배치하기",
      };
    }

    return {
      title: "다음 단계 · 작물별 재배 일정 만들기",
      description: "배치한 작물과 시즌 기간을 기준으로 심기와 수확 일정을 만들 수 있어요.",
      href: `/seasons/${season.id}/tasks`,
      label: "재배 일정 만들기",
    };
  }

  const layoutHref = `/seasons/${season.id}/layout`;

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
    href: `/seasons/${season.id}/tasks`,
    label: "재배 일정 만들기",
  };
}
