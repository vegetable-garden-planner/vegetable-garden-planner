import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES, CROP_SOURCES } from "../data/crop-references.ts";
import {
  filterCropReferences,
  validateCropReferenceData,
  type CropReference,
} from "./crop-reference.ts";

test("대표 작물 10종 기준 데이터가 유효하다", () => {
  assert.equal(CROP_REFERENCES.length, 10);
  assert.deepEqual(validateCropReferenceData(CROP_REFERENCES, CROP_SOURCES), []);
});

test("이름·과명·설명으로 작물을 검색한다", () => {
  assert.deepEqual(
    filterCropReferences(CROP_REFERENCES, {
      query: "가지과",
      category: "all",
      space: "all",
    }).map((crop) => crop.name),
    ["감자", "토마토", "고추"],
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

  assert.deepEqual(result.map((crop) => crop.name), ["상추", "시금치", "대파"]);
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
});
