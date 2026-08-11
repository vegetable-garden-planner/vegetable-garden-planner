import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecordDraft,
  validateCultivationRecordDraft,
  type CultivationRecord,
} from "./cultivation-record.ts";

const season = { startDate: "2026-04-01", endDate: "2026-10-31" };

test("시즌 안의 기록 입력을 서버 형식으로 변환한다", () => {
  const result = validateCultivationRecordDraft({
    type: "harvest",
    occurredAtLocal: "2026-06-01T09:30",
    notes: "  첫 수확  ",
    quantity: "1.25",
    unit: " kg ",
  }, season);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.type, "harvest");
    assert.equal(result.value.notes, "첫 수확");
    assert.equal(result.value.quantity, 1.25);
    assert.equal(result.value.unit, "kg");
    assert.match(result.value.occurredAt, /^2026-06-01T09:30:00[+-]\d{2}:\d{2}$/);
  }
});

test("빈 수량은 허용하지만 수량과 단위를 따로 입력하면 거부한다", () => {
  const empty = validateCultivationRecordDraft({
    type: "work", occurredAtLocal: "2026-06-01T09:30", notes: "", quantity: "", unit: "",
  }, season);
  const incomplete = validateCultivationRecordDraft({
    type: "growth", occurredAtLocal: "2026-06-01T09:30", notes: "", quantity: "10", unit: "",
  }, season);

  assert.equal(empty.valid, true);
  assert.equal(incomplete.valid, false);
  if (!incomplete.valid) assert.equal(incomplete.errors.unit, "수량과 단위를 함께 입력해 주세요.");
});

test("시즌 밖 날짜와 잘못된 경계값을 거부한다", () => {
  const result = validateCultivationRecordDraft({
    type: "unknown", occurredAtLocal: "2026-11-01T00:00", notes: "a".repeat(2001), quantity: "0", unit: "cm",
  }, season);

  assert.equal(result.valid, false);
  if (!result.valid) assert.deepEqual(Object.keys(result.errors).sort(), ["notes", "occurredAtLocal", "quantity", "type"]);
});

test("기존 기록은 수정 입력값으로 변환한다", () => {
  const record: CultivationRecord = {
    id: "record-1", seasonId: "season-1", type: "growth", occurredAt: "2026-06-01T00:30:00Z",
    notes: "키 측정", quantity: 12, unit: "cm", version: 2,
    createdAt: "2026-06-01T00:30:00Z", updatedAt: "2026-06-01T00:30:00Z",
  };
  const draft = createRecordDraft(season, record);

  assert.equal(draft.type, "growth");
  assert.equal(draft.quantity, "12");
  assert.equal(draft.unit, "cm");
});
