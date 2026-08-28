"use client";

import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { CropPanel } from "./panels/crop-panel";
import { GroupPanel } from "./panels/group-panel";
import { JournalPanel } from "./panels/journal-panel";
import { LayersPanel } from "./panels/layers-panel";
import { MemoPanel } from "./panels/memo-panel";
import { PlanterPanel } from "./panels/planter-panel";

/** 현재 도구에 맞는 왼쪽 패널 */
export function StudioPanel({ studio }: { studio: StudioController }) {
  switch (studio.tool) {
    case "planter": return <PlanterPanel studio={studio} />;
    case "group": return <GroupPanel studio={studio} />;
    case "note": return <MemoPanel studio={studio} />;
    case "journal": return <JournalPanel studio={studio} />;
    case "layers": return <LayersPanel studio={studio} />;
    default: return <CropPanel studio={studio} />;
  }
}
