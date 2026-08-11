import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES } from "../data/crop-references.ts";
import { createCropPageMetadata } from "./crop-page-metadata.ts";

test("작물 상세 메타데이터에 작물명과 설명을 사용한다", () => {
  assert.deepEqual(createCropPageMetadata("lettuce", CROP_REFERENCES), {
    title: "상추 재배 정보 | 심어봄",
    description: "화분과 텃밭에서 모두 시작하기 쉬운 잎채소입니다.",
  });
});

test("없는 작물에는 일반 작물 정보 메타데이터를 사용한다", () => {
  assert.deepEqual(createCropPageMetadata("missing", CROP_REFERENCES), {
    title: "작물 정보 | 심어봄",
    description: "심어봄에서 작물별 심는 시기와 재배 방법을 확인하세요.",
  });
});
