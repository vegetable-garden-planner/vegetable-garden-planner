import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
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

test("등록 식물을 진행 중, 예정, 종료 순으로 정렬한다", () => {
  const summaries = createRegisteredPlantSummaries([
    { ...activeSeason, id: "completed", startDate: "2026-01-01", endDate: "2026-02-01" },
    { ...activeSeason, id: "planned", startDate: "2026-10-01", endDate: "2026-12-31" },
    activeSeason,
  ], CROP_REFERENCES, "2026-08-07");

  assert.deepEqual(summaries.map((summary) => summary.seasonId), ["active", "planned", "completed"]);
  assert.match(summaries[0]?.careHint ?? "", /물|배지/);
});

test("기준 정보가 사라진 식물을 조용히 제외하지 않고 복구 대상으로 표시한다", () => {
  const summaries = createRegisteredPlantSummaries([
    { ...activeSeason, featuredCropId: "missing-crop" },
  ], CROP_REFERENCES, "2026-08-07");

  assert.equal(summaries[0]?.cropName, "정보가 삭제된 식물");
  assert.equal(summaries[0]?.cropHref, null);
});

test("빈 입력과 표시 개수 경계를 처리한다", () => {
  assert.deepEqual(createRegisteredPlantSummaries([], CROP_REFERENCES, "2026-08-07"), []);
  assert.deepEqual(createRegisteredPlantSummaries([activeSeason], CROP_REFERENCES, "2026-08-07", 0), []);
  assert.throws(
    () => createRegisteredPlantSummaries([activeSeason], CROP_REFERENCES, "2026-08-07", -1),
    RangeError,
  );
});
