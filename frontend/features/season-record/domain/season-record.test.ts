import assert from "node:assert/strict";
import test from "node:test";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import {
  createSeasonRecord,
  getSeasonRecords,
  validateSeasonRecord,
  type SeasonRecord,
} from "./season-record.ts";

const season: GrowingSeason = {
  id: "season-1",
  spaceId: "space-1",
  name: "봄 시즌",
  startDate: "2026-03-01",
  endDate: "2026-06-30",
  notes: "",
  createdAt: "2026-02-01T00:00:00.000Z",
};

test("시즌 기간 안의 기록을 검증하고 내용을 정리한다", () => {
  const result = validateSeasonRecord({
    seasonId: season.id,
    type: "watering",
    recordedOn: "2026-04-10",
    notes: "  흙이 마른 뒤 물주기  ",
  }, season);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.notes, "흙이 마른 뒤 물주기");
  }
});

test("없는 시즌, 잘못된 날짜와 시즌 밖 날짜를 거부한다", () => {
  const missingSeason = validateSeasonRecord({
    seasonId: "missing",
    type: "work",
    recordedOn: "2026-04-10",
    notes: "지지대 설치",
  }, undefined);
  const invalidDate = validateSeasonRecord({
    seasonId: season.id,
    type: "growth",
    recordedOn: "2026-02-30",
    notes: "새잎 확인",
  }, season);
  const outsideSeason = validateSeasonRecord({
    seasonId: season.id,
    type: "harvest",
    recordedOn: "2026-07-01",
    notes: "첫 수확",
  }, season);

  assert.equal(missingSeason.valid, false);
  assert.equal(invalidDate.valid, false);
  assert.equal(outsideSeason.valid, false);
  if (!outsideSeason.valid) {
    assert.match(outsideSeason.errors.recordedOn ?? "", /시즌 기간/);
  }
});

test("500자를 넘는 기록 내용을 거부한다", () => {
  const result = validateSeasonRecord({
    seasonId: season.id,
    type: "work",
    recordedOn: "2026-04-10",
    notes: "가".repeat(501),
  }, season);

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.errors.notes ?? "", /500자/);
  }
});

test("시즌 기록만 최신 날짜와 생성 순서로 조회한다", () => {
  const records: SeasonRecord[] = [
    createSeasonRecord(
      { seasonId: "season-2", type: "work", recordedOn: "2026-05-01", notes: "다른 시즌" },
      "record-3",
      "2026-05-01T00:00:00.000Z",
    ),
    createSeasonRecord(
      { seasonId: season.id, type: "watering", recordedOn: "2026-04-01", notes: "첫 기록" },
      "record-1",
      "2026-04-01T08:00:00.000Z",
    ),
    createSeasonRecord(
      { seasonId: season.id, type: "growth", recordedOn: "2026-04-01", notes: "두 번째 기록" },
      "record-2",
      "2026-04-01T09:00:00.000Z",
    ),
  ];

  assert.deepEqual(
    getSeasonRecords(records, season.id).map((record) => record.id),
    ["record-2", "record-1"],
  );
});
