"use client";

import type { StudioController } from "@/features/placement-studio/hooks/use-studio-controller";
import { TOOL_ICONS } from "./studio-icons";
import { STUDIO_TOOLS, TOOL_LABELS, type StudioTool } from "./studio-types";
import styles from "./placement-studio.module.css";

/** 왼쪽 도구 막대 (데스크톱) */
export function StudioRail({ studio }: { studio: StudioController }) {
  return (
    <nav className={styles.rail}>
      {STUDIO_TOOLS.map((tool) => (
        <button
          className={`${styles.tool} ${studio.tool === tool ? styles.toolActive : ""} ${tool === "layers" ? styles.toolBottom : ""}`}
          key={tool}
          onClick={() => studio.setTool(tool)}
          type="button"
        >
          {TOOL_ICONS[tool]}
          <span>{TOOL_LABELS[tool]}</span>
        </button>
      ))}
    </nav>
  );
}

/** 아래쪽 도구 막대 (모바일) */
export function StudioBottomTools({ studio }: { studio: StudioController }) {
  const tools: StudioTool[] = ["select", "crop", "planter", "group", "note", "journal", "layers"];

  return (
    <div className={styles.bottomTools}>
      {tools.map((tool) => (
        <button
          className={studio.tool === tool && studio.sheet === tool ? styles.toolActive : ""}
          key={tool}
          onClick={() => {
            if (tool === "select") {
              studio.setTool("select");
              studio.setSheet("select");
              return;
            }
            studio.setTool(tool);
            studio.setSheet(tool);
          }}
          type="button"
        >
          {TOOL_ICONS[tool]}
          <span>{tool === "select" ? "정보" : TOOL_LABELS[tool]}</span>
        </button>
      ))}
    </div>
  );
}
