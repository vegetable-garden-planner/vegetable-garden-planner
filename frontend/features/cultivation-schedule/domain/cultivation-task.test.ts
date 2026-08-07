import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";
import type { CropPlacement } from "../../garden-layout/domain/garden-layout.ts";
import { generateCultivationSchedule } from "./cultivation-task.ts";

const SPRING_SEASON = {
  id: "season-1",
  startDate: "2026-03-20",
  endDate: "2026-07-31",
};

test("배치된 작물마다 심기와 수확 일정을 한 번씩 생성한다", () => {
  const placements: CropPlacement[] = [
    { cellIndex: 0, cropId: "lettuce" },
    { cellIndex: 1, cropId: "potato" },
    { cellIndex: 2, cropId: "lettuce" },
  ];
  let id = 0;

  const result = generateCultivationSchedule(
    SPRING_SEASON,
    placements,
    CROP_REFERENCES,
    () => `task-${++id}`,
    "2026-08-07T00:00:00.000Z",
  );

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.tasks.length, 4);
  assert.deepEqual(
    result.tasks.map(({ title, type, dueDate }) => ({ title, type, dueDate })),
    [
      { title: "감자 씨감자 심기", type: "sowing", dueDate: "2026-03-20" },
      { title: "상추 모종 심기", type: "transplanting", dueDate: "2026-04-01" },
      { title: "상추 수확 시작하기", type: "harvest", dueDate: "2026-05-01" },
      { title: "감자 수확 시작하기", type: "harvest", dueDate: "2026-06-01" },
    ],
  );
  assert.ok(result.tasks.every((task) => task.status === "pending"));
  assert.ok(result.tasks.every((task) => task.completedAt === null));
});

test("해를 넘기는 시즌에서도 다음 해의 첫 권장 날짜를 찾는다", () => {
  const result = generateCultivationSchedule(
    { id: "season-2", startDate: "2026-11-01", endDate: "2027-06-30" },
    [{ cellIndex: 0, cropId: "lettuce" }],
    CROP_REFERENCES,
    () => "task-id",
    "now",
  );

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(
      result.tasks.map((task) => task.dueDate),
      ["2027-04-01", "2027-05-01"],
    );
  }
});

test("빈 배치와 기준 정보가 없는 작물은 생성하지 않는다", () => {
  const empty = generateCultivationSchedule(
    SPRING_SEASON,
    [],
    CROP_REFERENCES,
    () => "unused",
    "now",
  );
  const missing = generateCultivationSchedule(
    SPRING_SEASON,
    [{ cellIndex: 0, cropId: "missing" }],
    CROP_REFERENCES,
    () => "unused",
    "now",
  );

  assert.equal(empty.valid, false);
  assert.equal(missing.valid, false);
});

test("시즌과 작물 권장 시기가 겹치지 않으면 부분 일정을 만들지 않는다", () => {
  let idCalls = 0;
  const result = generateCultivationSchedule(
    { id: "season-3", startDate: "2026-08-01", endDate: "2026-10-31" },
    [{ cellIndex: 0, cropId: "potato" }],
    CROP_REFERENCES,
    () => `task-${++idCalls}`,
    "now",
  );

  assert.equal(result.valid, false);
  assert.equal(idCalls, 0);
  if (!result.valid) assert.match(result.message, /심는 시기/);
});

test("잘못된 시즌 날짜와 역전된 기간을 거부한다", () => {
  const invalidDate = generateCultivationSchedule(
    { id: "season", startDate: "2026-02-30", endDate: "2026-06-01" },
    [{ cellIndex: 0, cropId: "lettuce" }],
    CROP_REFERENCES,
    () => "unused",
    "now",
  );
  const reversed = generateCultivationSchedule(
    { id: "season", startDate: "2026-06-01", endDate: "2026-03-01" },
    [{ cellIndex: 0, cropId: "lettuce" }],
    CROP_REFERENCES,
    () => "unused",
    "now",
  );

  assert.equal(invalidDate.valid, false);
  assert.equal(reversed.valid, false);
});
