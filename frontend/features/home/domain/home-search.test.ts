import assert from "node:assert/strict";
import test from "node:test";
import type { CropReference } from "../../crop-catalog/domain/crop-reference.ts";
import type { CultivationTask } from "../../cultivation-schedule/domain/cultivation-task.ts";
import type { GrowingSeason } from "../../growing-season/domain/growing-season.ts";
import type { GrowingSpace } from "../../growing-space/domain/growing-space.ts";
import { homeQuickActions, searchHome, type HomeSearchInput } from "./home-search.ts";

function season(id: string, name: string): GrowingSeason {
  return {
    id,
    name,
    spaceId: "sp1",
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    notes: "",
    createdAt: "2026-03-01T00:00:00Z",
  };
}

function space(id: string, name: string): GrowingSpace {
  return {
    id,
    name,
    type: "balcony",
    sunlight: "full",
    widthCm: 90,
    lengthCm: 40,
    depthCm: 25,
    address: null,
    latitude: null,
    longitude: null,
    orientation: null,
    shadeLevel: null,
    estimatedSunlightHours: null,
    notes: "",
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function crop(id: string, name: string, familyName: string): CropReference {
  return {
    id,
    name,
    familyName,
    category: "fruit",
    difficulty: "normal",
    summary: `${name} 기르는 법`,
    plantingMaterial: "seedling",
    plantingPeriod: { label: "5월 초", startMonth: 5, endMonth: 5 },
    harvestPeriod: { label: "7월", startMonth: 7, endMonth: 8 },
    plantSpacingCm: 40,
    rowSpacingCm: 60,
    minimumDepthCm: 30,
    sunlight: "full",
    supportedSpaces: ["balcony"],
    needsSupport: true,
    wateringNote: "",
    careSteps: [],
    companionNote: "",
    sourceIds: [],
  } as unknown as CropReference;
}

function task(id: string, type: CultivationTask["type"], dueDate: string): CultivationTask {
  return {
    id,
    seasonId: "se1",
    type,
    title: `${type} 작업`,
    dueDate,
    status: "pending",
    notes: "",
  } as unknown as CultivationTask;
}

const input: HomeSearchInput = {
  seasons: [season("se1", "봄 잎채소 계획"), season("se2", "여름 토마토 계획")],
  spaces: [space("sp1", "남향 베란다")],
  crops: [crop("tomato", "토마토", "가지과"), crop("basil", "바질", "꿀풀과")],
  cropImages: { tomato: "/crops/tomato.png" },
  spaceLabels: { balcony: "베란다" },
};

test("빈 검색어에는 결과를 만들지 않는다", () => {
  assert.deepEqual(searchHome("   ", input), []);
});

test("계획 · 공간 · 작물을 한 번에 찾는다", () => {
  const hits = searchHome("토마토", input);
  assert.deepEqual(hits.map((hit) => hit.key), ["plan:se2", "crop:tomato"]);
  assert.equal(hits[0].href, "/seasons/se2/edit");
  assert.equal(hits[1].href, "/crops/tomato");
});

test("앞에서부터 맞는 이름을 위로 올린다", () => {
  const hits = searchHome("베란다", input);
  assert.equal(hits[0].key, "space:sp1");
  assert.match(hits[0].subtitle, /재배 공간 · 베란다/);
});

test("이미지가 있는 작물만 그림 경로를 준다", () => {
  assert.equal(searchHome("토마토", input).find((hit) => hit.kind === "crop")?.image, "/crops/tomato.png");
  assert.equal(searchHome("바질", input).find((hit) => hit.kind === "crop")?.image, null);
});

test("찾지 못하면 빈 목록이다 — 없는 결과를 만들지 않는다", () => {
  assert.deepEqual(searchHome("없는작물이름", input), []);
});

test("빠른 이동 칩은 실제로 남아 있는 일이 있을 때만 만든다", () => {
  const today = "2026-05-10";
  const none = homeQuickActions([], today);
  assert.deepEqual(none.map((action) => action.key), ["crops", "spaces"]);

  const some = homeQuickActions(
    [task("t1", "watering", "2026-05-10"), task("t2", "harvest", "2026-05-01")],
    today,
  );
  assert.deepEqual(some.map((action) => action.key), ["watering", "overdue", "harvest", "crops", "spaces"]);
  assert.equal(some[0].href, "/seasons/se1/watering");
  assert.equal(some[0].count, 1);
  assert.equal(some[3].count, null);
});

test("아직 기한이 남은 일은 지난 일로 세지 않는다", () => {
  const actions = homeQuickActions([task("t1", "watering", "2026-05-20")], "2026-05-10");
  assert.deepEqual(actions.map((action) => action.key), ["crops", "spaces"]);
});
