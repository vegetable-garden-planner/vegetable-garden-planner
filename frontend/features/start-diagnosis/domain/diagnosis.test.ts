import assert from "node:assert/strict";
import test from "node:test";
import {
  getRecommendation,
  isCompleteDiagnosis,
} from "./diagnosis.ts";

test("답변이 비어 있으면 진단 완료로 판단하지 않는다", () => {
  assert.equal(isCompleteDiagnosis({}), false);
});

test("모든 답변이 있으면 진단 완료로 판단한다", () => {
  assert.equal(isCompleteDiagnosis({
    space: "indoor",
    sunlight: "partial",
    careTime: "medium",
    goal: "easy",
  }), true);
});

test("공간이 없는 초보자에게 실내 화분을 추천한다", () => {
  const result = getRecommendation({
    space: "none",
    sunlight: "low",
    careTime: "low",
    goal: "easy",
  });

  assert.equal(result.spaceType, "실내 화분");
  assert.deepEqual(result.plants, ["스킨답서스", "테이블야자"]);
});

test("먹거리 목적의 베란다 사용자에게 관리 시간에 맞는 식물을 추천한다", () => {
  const result = getRecommendation({
    space: "balcony",
    sunlight: "full",
    careTime: "low",
    goal: "edible",
  });

  assert.equal(result.spaceType, "베란다 재배");
  assert.deepEqual(result.plants, ["로즈마리", "쪽파"]);
});

test("햇빛이 적은 베란다에는 음지 조건에 맞는 식물을 추천한다", () => {
  const result = getRecommendation({
    space: "balcony",
    sunlight: "low",
    careTime: "medium",
    goal: "flowers",
  });

  assert.deepEqual(result.plants, ["베고니아", "임파첸스"]);
});

test("야외에서 꽃을 원하는 사용자에게 꽃 작물을 추천한다", () => {
  const result = getRecommendation({
    space: "outdoor",
    sunlight: "full",
    careTime: "high",
    goal: "flowers",
  });

  assert.equal(result.spaceType, "마당·텃밭");
  assert.deepEqual(result.plants, ["메리골드", "백일홍"]);
});
