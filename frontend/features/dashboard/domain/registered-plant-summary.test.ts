import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";
import type { CultivationRecord } from "../../cultivation-record/domain/cultivation-record.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import { createRegisteredPlantSummaries } from "./registered-plant-summary.ts";

const activeSeason: GrowingSeason = {
  id: "active",
  spaceId: "space-1",
  name: "호접란 관리",
  startDate: "2026-08-01",
  endDate: "2026-12-31",
  notes: "",
  featuredCropId: "moth-orchid",
  createdAt: "2026-08-01T00:00:00.000Z",
};

const space: GrowingSpace = {
  id: "space-1",
  name: "거실 창가",
  type: "indoor",
  sunlight: "partial",
  widthCm: 60,
  lengthCm: 30,
  depthCm: null,
  shadeLevel: null,
  address: null,
  latitude: null,
  longitude: null,
  orientation: null,
  estimatedSunlightHours: null,
  notes: "",
  version: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function call(
  seasons: readonly GrowingSeason[],
  today: string,
  limit?: number,
  tasks: readonly CultivationTask[] = [],
  records: readonly CultivationRecord[] = [],
  attentionSeasonIds: ReadonlySet<string> = new Set(),
) {
  return createRegisteredPlantSummaries(
    seasons,
    CROP_REFERENCES,
    [space],
    tasks,
    records,
    attentionSeasonIds,
    today,
    limit,
  );
}

test("등록 식물을 진행 중, 예정, 종료 순으로 정렬한다", () => {
  const summaries = call([
    { ...activeSeason, id: "completed", startDate: "2026-01-01", endDate: "2026-02-01" },
    { ...activeSeason, id: "planned", startDate: "2026-10-01", endDate: "2026-12-31" },
    activeSeason,
  ], "2026-08-07");

  assert.deepEqual(summaries.map((summary) => summary.seasonId), ["active", "planned", "completed"]);
  assert.match(summaries[0]?.careHint ?? "", /물|배지/);
  assert.equal(summaries[0]?.spaceName, "거실 창가");
});

test("기준 정보가 사라진 식물을 조용히 제외하지 않고 복구 대상으로 표시한다", () => {
  const summaries = call([{ ...activeSeason, featuredCropId: "missing-crop" }], "2026-08-07");

  assert.equal(summaries[0]?.cropName, "정보가 삭제된 식물");
  assert.equal(summaries[0]?.cropHref, null);
});

test("대표 작물이 없어도 화분 배치가 있으면 목록에 포함한다", () => {
  const season: GrowingSeason = { ...activeSeason, id: "placed", featuredCropId: undefined };
  const summaries = createRegisteredPlantSummaries(
    [season],
    CROP_REFERENCES,
    [space],
    [],
    [],
    new Set(),
    "2026-08-07",
    4,
    new Map([["placed", "african-violet"]]),
  );

  assert.equal(summaries[0]?.cropId, "african-violet");
});

test("빈 입력과 표시 개수 경계를 처리한다", () => {
  assert.deepEqual(call([], "2026-08-07"), []);
  assert.deepEqual(call([activeSeason], "2026-08-07", 0), []);
  assert.throws(() => call([activeSeason], "2026-08-07", -1), RangeError);
});

test("가장 이른 예정 일정과 가장 최근 기록, 확인 필요 여부를 카드에 담는다", () => {
  const tasks: CultivationTask[] = [
    {
      id: "t1", seasonId: "active", cropId: "moth-orchid", type: "watering", title: "물 주기",
      dueDate: "2026-09-01", notes: "", status: "pending", completedAt: null, version: 1,
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "t2", seasonId: "active", cropId: "moth-orchid", type: "harvest", title: "관찰",
      dueDate: "2026-08-15", notes: "", status: "pending", completedAt: null, version: 1,
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ];
  const records: CultivationRecord[] = [
    {
      id: "r1", seasonId: "active", type: "growth", occurredAt: "2026-08-01T00:00:00.000Z",
      notes: "새 잎 확인", quantity: null, unit: null, photoUrl: null, version: 1,
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "r2", seasonId: "active", type: "growth", occurredAt: "2026-08-10T00:00:00.000Z",
      notes: "흙이 빨리 마름", quantity: null, unit: null, photoUrl: null, version: 1,
      createdAt: "2026-08-10T00:00:00.000Z", updatedAt: "2026-08-10T00:00:00.000Z",
    },
  ];

  const summaries = call([activeSeason], "2026-08-07", 4, tasks, records, new Set(["active"]));

  assert.equal(summaries[0]?.nextTaskTitle, "관찰");
  assert.equal(summaries[0]?.latestRecordNote, "흙이 빨리 마름");
  assert.equal(summaries[0]?.needsAttention, true);
});
