import assert from "node:assert/strict";
import test from "node:test";
import {
  CROP_OPTIONS,
  DEFAULT_SELECTED_CROPS,
  getPlantingSlots,
  toggleCropSelection,
} from "./crop-selection.ts";

test("작물 선택 화면은 지정된 6종과 기본 선택을 유지한다", () => {
  assert.deepEqual(CROP_OPTIONS.map((crop) => crop.name), [
    "상추",
    "방울토마토",
    "바질",
    "고추",
    "시금치",
    "딸기",
  ]);
  assert.deepEqual(DEFAULT_SELECTED_CROPS, ["lettuce", "basil"]);
  assert.equal(CROP_OPTIONS.every((crop) => !crop.image.endsWith(".svg")), true);
});

test("카드와 칩은 같은 토글 규칙을 사용한다", () => {
  const added = toggleCropSelection(DEFAULT_SELECTED_CROPS, "cherry-tomato");
  assert.deepEqual(added, ["lettuce", "basil", "cherry-tomato"]);
  assert.deepEqual(toggleCropSelection(added, "basil"), ["lettuce", "cherry-tomato"]);
});

test("선택 수별 슬롯은 화분 중심에 균형 있게 배치된다", () => {
  assert.deepEqual(getPlantingSlots(0), []);
  assert.deepEqual(getPlantingSlots(1), [[0, 0]]);
  assert.equal(getPlantingSlots(6).length, 6);

  const twoSlots = getPlantingSlots(2);
  assert.equal(twoSlots[0][0], -twoSlots[1][0]);
  assert.equal(twoSlots[0][1], twoSlots[1][1]);
});
