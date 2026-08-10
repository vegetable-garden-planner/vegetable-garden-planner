import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import { createDashboardSummary } from "./dashboard-summary.ts";

const garden: GrowingSpace = {
  id: "space-1",
  name: "주말 텃밭",
  type: "garden",
  sunlight: "full",
  widthCm: 200,
  lengthCm: 300,
  region: "서울",
  notes: "",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const activeSeason: GrowingSeason = {
  id: "season-active",
  spaceId: garden.id,
  name: "여름 재배",
  startDate: "2026-06-01",
  endDate: "2026-09-30",
  notes: "",
  createdAt: "2026-05-01T00:00:00.000Z",
};

const layout: GardenLayout = {
  seasonId: activeSeason.id,
  spaceId: garden.id,
  spaceWidthCm: 200,
  spaceLengthCm: 300,
  cellSizeCm: 50,
  columns: 4,
  rows: 6,
  placements: [],
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const task: CultivationTask = {
  id: "task-1",
  seasonId: activeSeason.id,
  cropId: "lettuce",
  type: "transplanting",
  title: "상추 모종 심기",
  dueDate: "2026-06-01",
  notes: "",
  status: "pending",
  completedAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

test("빈 사용자에게 공간 등록을 첫 작업으로 안내한다", () => {
  const summary = createDashboardSummary([], [], [], [], "2026-08-06");

  assert.equal(summary.spaceCount, 0);
  assert.equal(summary.nextAction.href, "/spaces/new");
  assert.deepEqual(summary.recentSeasons, []);
});

test("공간만 있으면 시즌 등록을 안내한다", () => {
  const summary = createDashboardSummary([garden], [], [], [], "2026-08-06");

  assert.equal(summary.nextAction.href, "/seasons/new");
});

test("격자가 없는 텃밭 시즌을 작물 배치로 연결한다", () => {
  const summary = createDashboardSummary(
    [garden],
    [activeSeason],
    [],
    [],
    "2026-08-06",
  );

  assert.equal(summary.activeSeasonCount, 1);
  assert.equal(summary.nextAction.href, "/seasons/season-active/layout");
  assert.equal(summary.recentSeasons[0]?.layoutHref, "/seasons/season-active/layout");
});

test("격자가 있고 일정이 없으면 일정 자동 생성으로 연결한다", () => {
  const summary = createDashboardSummary(
    [garden],
    [activeSeason],
    [layout],
    [],
    "2026-08-06",
  );

  assert.equal(summary.layoutCount, 1);
  assert.equal(summary.nextAction.href, "/seasons/season-active/tasks");
  assert.equal(summary.recentSeasons[0]?.layoutHref, undefined);
  assert.equal(summary.recentSeasons[0]?.scheduleHref, "/seasons/season-active/tasks");
});

test("일정까지 있으면 저장된 계획 관리로 연결한다", () => {
  const summary = createDashboardSummary(
    [garden],
    [activeSeason],
    [layout],
    [task],
    "2026-08-06",
  );

  assert.equal(summary.nextAction.href, "/seasons");
});

test("진행 중, 예정, 종료 순으로 최근 시즌을 정렬하고 세 개만 표시한다", () => {
  const seasons: GrowingSeason[] = [
    { ...activeSeason, id: "completed", startDate: "2025-03-01", endDate: "2025-05-01" },
    { ...activeSeason, id: "planned", startDate: "2026-10-01", endDate: "2026-12-01" },
    activeSeason,
    { ...activeSeason, id: "older-completed", startDate: "2024-03-01", endDate: "2024-05-01" },
  ];

  const summary = createDashboardSummary([garden], seasons, [], [], "2026-08-06");

  assert.deepEqual(
    summary.recentSeasons.map((season) => season.id),
    ["season-active", "planned", "completed"],
  );
});

test("삭제된 공간을 참조하는 시즌도 오류 없이 명시한다", () => {
  const summary = createDashboardSummary([], [activeSeason], [], [], "2026-08-06");

  assert.equal(summary.recentSeasons[0]?.spaceName, "연결 공간 없음");
});
