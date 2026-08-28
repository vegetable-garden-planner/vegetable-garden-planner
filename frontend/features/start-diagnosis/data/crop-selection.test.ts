import assert from "node:assert/strict";
import test from "node:test";
import { CROP_REFERENCES } from "../../crop-catalog/data/crop-references.ts";
import {
  CROP_OPTIONS,
  DEFAULT_SELECTED_CROPS,
  MVP_CROP_IDS,
  getPlantingSlots,
  toggleCropSelection,
} from "./crop-selection.ts";

test("진단 작물은 모두 실제 서비스 작물 ID를 쓴다", () => {
  const serviceIds = new Set(CROP_REFERENCES.map((crop) => crop.id));
  for (const id of MVP_CROP_IDS) {
    assert.equal(serviceIds.has(id), true, `서비스에 없는 작물 ID: ${id}`);
  }
});

test("진단 작물은 모두 베란다·화분에서 키울 수 있다", () => {
  const referenceById = new Map(CROP_REFERENCES.map((crop) => [crop.id, crop]));
  for (const id of MVP_CROP_IDS) {
    const reference = referenceById.get(id);
    assert.ok(reference);
    assert.equal(
      reference.supportedSpaces.includes("balcony"),
      true,
      `베란다에서 키울 수 없는 작물이 들어 있음: ${id}`,
    );
  }
});

test("작물 이름과 난이도는 서비스 기준 데이터에서 온다", () => {
  const referenceById = new Map(CROP_REFERENCES.map((crop) => [crop.id, crop]));
  for (const option of CROP_OPTIONS) {
    assert.equal(option.name, referenceById.get(option.id)?.name);
  }
  assert.deepEqual(CROP_OPTIONS.map((crop) => crop.name), [
    "상추",
    "시금치",
    "열무",
    "대파",
    "당근",
    "토마토",
  ]);
});

test("기본 선택은 가장 쉬운 잎채소 두 가지다", () => {
  assert.deepEqual(DEFAULT_SELECTED_CROPS, ["lettuce", "spinach"]);
});

test("카드와 칩은 같은 토글 규칙을 사용한다", () => {
  const added = toggleCropSelection(DEFAULT_SELECTED_CROPS, "tomato");
  assert.deepEqual(added, ["lettuce", "spinach", "tomato"]);
  assert.deepEqual(toggleCropSelection(added, "spinach"), ["lettuce", "tomato"]);
});

test("선택 수별 슬롯은 화분 중심에 균형 있게 배치된다", () => {
  assert.deepEqual(getPlantingSlots(0), []);
  assert.deepEqual(getPlantingSlots(1), [[0, 0]]);
  assert.equal(getPlantingSlots(6).length, 6);

  const twoSlots = getPlantingSlots(2);
  assert.equal(twoSlots[0][0], -twoSlots[1][0]);
  assert.equal(twoSlots[0][1], twoSlots[1][1]);
});
