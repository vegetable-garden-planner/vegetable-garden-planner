import assert from "node:assert/strict";
import test from "node:test";
import { createHomeDashboardModel } from "./home-dashboard.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GardenLayout } from "../../garden-layout/domain/garden-layout.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";

test("홈 요약은 실제 시즌·배치·미완료 일정에서 계산한다", () => {
  const space: GrowingSpace = {
    id: "space-1", name: "베란다", type: "balcony", sunlight: "full",
    address: null, latitude: null, longitude: null, orientation: null, estimatedSunlightHours: null,
    widthCm: 200, lengthCm: 100, depthCm: null, shadeLevel: null, notes: "", version: 1,
    createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  };
  const season: GrowingSeason = {
    id: "season-1", spaceId: space.id, name: "여름", startDate: "2026-08-01",
    endDate: "2026-08-20", notes: "", featuredCropId: "lettuce", createdAt: "2026-08-01T00:00:00Z",
  };
  const layout: GardenLayout = {
    seasonId: season.id, spaceId: space.id, spaceWidthCm: 200, spaceLengthCm: 100,
    cellSizeCm: 25, columns: 8, rows: 4, placements: [{ cellIndex: 0, cropId: "lettuce" }], version: 1,
    updatedAt: "2026-08-01T00:00:00Z",
  };
  const task: CultivationTask = {
    id: "task-1", seasonId: season.id, cropId: "lettuce", type: "harvest",
    title: "상추 수확", dueDate: "2026-08-15", notes: "잎 크기를 확인하세요.", status: "pending",
    completedAt: null, version: 1, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  };

  const model = createHomeDashboardModel([space], [season], [layout], [task], CROP_REFERENCES, "2026-08-10");

  assert.equal(model.primaryCrop?.id, "lettuce");
  assert.equal(model.cropCount, 1);
  assert.equal(model.growingDay, 10);
  assert.equal(model.progress, 50);
  assert.equal(model.daysUntilHarvest, 5);
  assert.equal(model.todayTaskCount, 0);
  assert.equal(model.tasks[0]?.title, "상추 수확");
});

test("대표 작물 없이 화분 배치만 있는 시즌도 관리 작물로 센다", () => {
  const space: GrowingSpace = {
    id: "space-1", name: "거실 화분", type: "indoor", sunlight: "partial",
    address: null, latitude: null, longitude: null, orientation: null, estimatedSunlightHours: null,
    widthCm: 60, lengthCm: 30, depthCm: null, shadeLevel: null, notes: "", version: 1,
    createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  };
  const season: GrowingSeason = {
    id: "season-1", spaceId: space.id, name: "가을", startDate: "2026-08-01",
    endDate: "2026-11-30", notes: "", featuredCropId: undefined, createdAt: "2026-08-01T00:00:00Z",
  };

  const model = createHomeDashboardModel(
    [space], [season], [], [], CROP_REFERENCES, "2026-08-10",
    [{ seasonId: season.id, cropId: "african-violet" }],
  );

  assert.equal(model.primaryCrop?.id, "african-violet");
  assert.equal(model.cropCount, 1);
});

test("지난 수확 일정은 경과 일수를 음수로 유지한다", () => {
  const season: GrowingSeason = {
    id: "season-1", spaceId: "space-1", name: "여름", startDate: "2026-08-01",
    endDate: "2026-08-31", notes: "", featuredCropId: "lettuce", createdAt: "2026-08-01T00:00:00Z",
  };
  const task: CultivationTask = {
    id: "task-1", seasonId: season.id, cropId: "lettuce", type: "harvest",
    title: "상추 수확", dueDate: "2026-08-08", notes: "", status: "pending",
    completedAt: null, version: 1, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  };

  const model = createHomeDashboardModel([], [season], [], [task], CROP_REFERENCES, "2026-08-10");

  assert.equal(model.daysUntilHarvest, -2);
});
