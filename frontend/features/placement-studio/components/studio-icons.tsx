import type { ReactElement } from "react";
import type { StudioTool } from "./studio-types";

/** 프로토타입의 아이콘 세트를 그대로 옮겼다. */
export const TOOL_ICONS: Record<StudioTool, ReactElement> = {
  select: (
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 3l12 9-6 1-3 6z" /></svg>
  ),
  crop: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 21v-9" />
      <path d="M12 12C8 12 5 9 5 5c4 0 7 3 7 7Z" />
      <path d="M12 10c0-4 3-7 7-7 0 4-3 7-7 7Z" />
    </svg>
  ),
  planter: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 8h14l-1.5 12h-11z" />
      <path d="M4 5h16v3H4z" />
    </svg>
  ),
  group: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="6" rx="1" width="7" x="4" y="5" />
      <rect height="6" rx="1" width="7" x="13" y="5" />
      <rect height="6" rx="1" width="7" x="8.5" y="14" />
      <path d="M7.5 11v1.5h9V11" />
    </svg>
  ),
  note: (
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4h14M12 4v16M8 20h8" /></svg>
  ),
  journal: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 3h12v18H6z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  ),
  layers: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <path d="M8 5v4M16 10v4M11 15v4" />
    </svg>
  ),
};
