import test from "node:test";
import assert from "node:assert/strict";
import { selectedPostcodeAddress, type PostcodeResult } from "./postcode-address.ts";

function result(overrides: Partial<PostcodeResult> = {}): PostcodeResult {
  return {
    address: "서울 중구 태평로1가 31",
    buildingName: "서울특별시청",
    jibunAddress: "서울 중구 태평로1가 31",
    roadAddress: "서울 중구 세종대로 110",
    zonecode: "04524",
    ...overrides,
  };
}

test("우편번호 검색 결과에서는 도로명 주소를 우선한다", () => {
  assert.equal(selectedPostcodeAddress(result()), "서울 중구 세종대로 110");
});

test("도로명 주소가 없으면 지번 주소를 사용한다", () => {
  assert.equal(selectedPostcodeAddress(result({ roadAddress: "" })), "서울 중구 태평로1가 31");
});
