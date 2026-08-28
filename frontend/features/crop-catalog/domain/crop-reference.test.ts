import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES, CROP_SOURCES } from "../data/crop-references.ts";
import {
  filterCropReferences,
  validateCropReferenceData,
  type CropReference,
} from "./crop-reference.ts";

test("대표 채소와 꽃 16종 기준 데이터가 유효하다", () => {
  assert.equal(CROP_REFERENCES.length, 16);
  assert.deepEqual(validateCropReferenceData(CROP_REFERENCES, CROP_SOURCES), []);
});

test("꽃다발은 접속 가능한 Iowa State 공식 관리 자료를 사용한다", () => {
  const bouquet = CROP_REFERENCES.find((crop) => crop.id === "gift-bouquet");
  const source = CROP_SOURCES.find(
    (candidate) => candidate.id === bouquet?.sourceId,
  );

  assert.ok(source);
  assert.equal(source.organization, "Iowa State University Extension and Outreach");
  assert.equal(
    source.url,
    "https://yardandgarden.extension.iastate.edu/how-to/how-harvest-condition-and-care-cut-flowers",
  );
  assert.equal(
    CROP_SOURCES.some((candidate) => candidate.id === "penn-state-cut-flower-care"),
    false,
  );
});

test("이름·과명·설명으로 작물을 검색한다", () => {
  assert.deepEqual(
    filterCropReferences(CROP_REFERENCES, {
      query: "가지과",
      category: "all",
      space: "all",
    }).map((crop) => crop.name),
    ["감자", "토마토", "고추", "방울토마토"],
  );
  assert.deepEqual(
    filterCropReferences(CROP_REFERENCES, {
      query: "지지대",
      category: "all",
      space: "all",
    }).map((crop) => crop.name),
    ["강낭콩", "토마토", "고추"],
  );
});

test("카테고리와 공간 조건을 함께 적용한다", () => {
  const result = filterCropReferences(CROP_REFERENCES, {
    query: "",
    category: "leaf",
    space: "balcony",
  });

  assert.deepEqual(result.map((crop) => crop.name), ["상추", "시금치", "대파", "바질"]);
});

test("꽃과 꽃다발 관리 내용도 검색하고 꽃 관리 안내 누락을 거부한다", () => {
  assert.deepEqual(
    filterCropReferences(CROP_REFERENCES, {
      query: "꽃병",
      category: "flower",
      space: "indoor",
    }).map((crop) => crop.name),
    ["꽃다발"],
  );

  const flower = CROP_REFERENCES.find((crop) => crop.id === "moth-orchid");
  assert.ok(flower);
  assert.ok(
    validateCropReferenceData(
      [{ ...flower, careGuide: undefined }],
      CROP_SOURCES,
    ).some((error) => error.includes("꽃 관리 안내")),
  );
});

test("연도를 넘는 심는 시기와 수확 시기를 허용한다", () => {
  const winterCrop: CropReference = {
    ...CROP_REFERENCES[0],
    id: "winter-crop",
    name: "겨울 작물",
    plantingPeriod: { startMonth: 11, endMonth: 2, label: "11월~2월" },
    harvestPeriod: { startMonth: 12, endMonth: 3, label: "12월~3월" },
  };

  assert.deepEqual(
    validateCropReferenceData([winterCrop], CROP_SOURCES),
    [],
  );
});

test("빈 데이터와 중복·경계값·출처 누락을 거부한다", () => {
  assert.deepEqual(validateCropReferenceData([], CROP_SOURCES), [
    "작물 데이터가 비어 있습니다.",
  ]);

  const invalid: CropReference = {
    ...CROP_REFERENCES[0],
    plantingPeriod: { startMonth: 0, endMonth: 13, label: "" },
    plantSpacingCm: 0,
    supportedSpaces: [],
    sourceId: "missing",
  };
  const errors = validateCropReferenceData(
    [invalid, { ...invalid }],
    CROP_SOURCES,
  );

  assert.ok(errors.some((error) => error.startsWith("중복 작물 ID")));
  assert.ok(errors.some((error) => error.startsWith("중복 작물 이름")));
  assert.ok(errors.some((error) => error.includes("출처")));
  assert.ok(errors.some((error) => error.includes("심는 시기")));
  assert.ok(errors.some((error) => error.includes("포기 간격")));
  assert.ok(errors.some((error) => error.includes("지원 공간")));

  for (const plantingPeriod of [
    { startMonth: 13, endMonth: 1, label: "잘못된 시작 월" },
    { startMonth: 1, endMonth: 0, label: "잘못된 종료 월" },
  ]) {
    assert.ok(
      validateCropReferenceData(
        [{ ...CROP_REFERENCES[0], plantingPeriod }],
        CROP_SOURCES,
      ).some((error) => error.includes("심는 시기")),
    );
  }
});
