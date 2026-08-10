import assert from "node:assert/strict";
import test from "node:test";
import {
  createGrowingSeason,
  getGrowingSeasonStatus,
  validateGrowingSeason,
  type GrowingSeasonFormValues,
} from "./growing-season.ts";

const validValues: GrowingSeasonFormValues = {
  spaceId: "space-1",
  name: "2026년 봄 시즌",
  startDate: "2026-03-01",
  endDate: "2026-06-30",
  notes: "상추와 토마토 재배",
};

test("등록된 공간과 정상 날짜의 시즌 입력을 허용한다", () => {
  const result = validateGrowingSeason(validValues, ["space-1"]);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.name, "2026년 봄 시즌");
    assert.equal(result.value.spaceId, "space-1");
  }
});

test("등록되지 않은 공간과 빈 이름을 거부한다", () => {
  const result = validateGrowingSeason(
    { ...validValues, spaceId: "missing", name: " " },
    ["space-1"],
  );
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.errors.spaceId);
    assert.ok(result.errors.name);
  }
});

test("존재하지 않는 날짜를 거부한다", () => {
  const result = validateGrowingSeason(
    { ...validValues, startDate: "2026-02-30" },
    ["space-1"],
  );
  assert.equal(result.valid, false);
  if (!result.valid) assert.ok(result.errors.startDate);
});

test("종료일이 시작일보다 빠르거나 730일을 넘으면 거부한다", () => {
  const reversed = validateGrowingSeason(
    { ...validValues, startDate: "2026-06-30", endDate: "2026-03-01" },
    ["space-1"],
  );
  const tooLong = validateGrowingSeason(
    { ...validValues, startDate: "2026-01-01", endDate: "2028-01-02" },
    ["space-1"],
  );
  assert.equal(reversed.valid, false);
  assert.equal(tooLong.valid, false);
  if (!reversed.valid) assert.ok(reversed.errors.endDate);
  if (!tooLong.valid) assert.ok(tooLong.errors.endDate);
});

test("검증된 입력으로 시즌 엔티티를 생성한다", () => {
  const result = validateGrowingSeason(validValues, ["space-1"]);
  assert.equal(result.valid, true);
  if (!result.valid) return;

  const season = createGrowingSeason(
    { ...result.value, featuredCropId: "lettuce" },
    "season-1",
    "2026-08-05T00:00:00.000Z",
  );
  assert.equal(season.id, "season-1");
  assert.equal(season.createdAt, "2026-08-05T00:00:00.000Z");
  assert.equal(season.featuredCropId, "lettuce");
});

test("같은 공간에서 하루라도 기간이 겹치는 시즌은 거부한다", () => {
  const existing = createGrowingSeason(
    validValues,
    "season-1",
    "2026-01-01T00:00:00.000Z",
  );
  const result = validateGrowingSeason(
    { ...validValues, name: "여름 시즌", startDate: "2026-06-30", endDate: "2026-09-30" },
    ["space-1"],
    [existing],
  );

  assert.equal(result.valid, false);
  if (!result.valid) assert.ok(result.errors.startDate);
});

test("다른 공간, 겹치지 않는 기간과 현재 수정 중인 시즌은 허용한다", () => {
  const existing = createGrowingSeason(
    validValues,
    "season-1",
    "2026-01-01T00:00:00.000Z",
  );
  const nextSeason = validateGrowingSeason(
    { ...validValues, name: "가을 시즌", startDate: "2026-07-01", endDate: "2026-09-30" },
    ["space-1"],
    [existing],
  );
  const otherSpace = validateGrowingSeason(
    { ...validValues, spaceId: "space-2" },
    ["space-1", "space-2"],
    [existing],
  );
  const editingCurrent = validateGrowingSeason(
    validValues,
    ["space-1"],
    [existing],
    "season-1",
  );

  assert.equal(nextSeason.valid, true);
  assert.equal(otherSpace.valid, true);
  assert.equal(editingCurrent.valid, true);
});

test("오늘 날짜가 시즌 기간 전, 중, 후인지 상태를 계산한다", () => {
  const season = createGrowingSeason(
    validValues,
    "season-1",
    "2026-01-01T00:00:00.000Z",
  );

  assert.equal(getGrowingSeasonStatus(season, "2026-02-28"), "planned");
  assert.equal(getGrowingSeasonStatus(season, "2026-03-01"), "active");
  assert.equal(getGrowingSeasonStatus(season, "2026-06-30"), "active");
  assert.equal(getGrowingSeasonStatus(season, "2026-07-01"), "completed");
});
