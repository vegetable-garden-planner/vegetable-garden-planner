import assert from "node:assert/strict";
import test from "node:test";
import {
  createGrowingSpace,
  validateGrowingSpace,
  type GrowingSpaceFormValues,
} from "./growing-space.ts";

const validValues: GrowingSpaceFormValues = {
  name: "우리집 베란다",
  type: "balcony",
  sunlight: "full",
  widthCm: "400",
  lengthCm: "150",
  depthCm: "20",
  address: "서울특별시 중구 세종대로 110",
  latitude: "37.5665000",
  longitude: "126.9780000",
  orientation: "south",
  shadeLevel: "some",
  estimatedSunlightHours: 6.5,
  notes: "남향",
};

test("정상 공간 입력을 숫자 크기로 변환한다", () => {
  const result = validateGrowingSpace(validValues);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.widthCm, 400);
    assert.equal(result.value.depthCm, 20);
    assert.equal(result.value.name, "우리집 베란다");
  }
});

test("햇빛과 가림 정도는 모름(null)을 허용한다", () => {
  const result = validateGrowingSpace({ ...validValues, sunlight: null, shadeLevel: null });
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.sunlight, null);
    assert.equal(result.value.shadeLevel, null);
  }
});

test("깊이는 선택 입력이며 범위를 벗어나면 거부한다", () => {
  const empty = validateGrowingSpace({ ...validValues, depthCm: "" });
  assert.equal(empty.valid, true);
  if (empty.valid) assert.equal(empty.value.depthCm, null);

  const tooDeep = validateGrowingSpace({ ...validValues, depthCm: "1001" });
  assert.equal(tooDeep.valid, false);
});

test("빈 이름을 거부한다", () => {
  const result = validateGrowingSpace({ ...validValues, name: "  " });
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(Boolean(result.errors.name), true);
  }
});

test("0, 음수와 최대 범위 초과 크기를 거부한다", () => {
  for (const widthCm of ["0", "-10", "100001"]) {
    const result = validateGrowingSpace({ ...validValues, widthCm });
    assert.equal(result.valid, false);
  }
});

test("검증된 입력으로 공간 엔티티를 생성한다", () => {
  const result = validateGrowingSpace(validValues);
  assert.equal(result.valid, true);
  if (!result.valid) return;

  const space = createGrowingSpace(result.value, "space-1", "2026-08-05T00:00:00.000Z");
  assert.equal(space.id, "space-1");
  assert.equal(space.type, "balcony");
});
