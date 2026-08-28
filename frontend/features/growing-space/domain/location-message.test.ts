import test from "node:test";
import assert from "node:assert/strict";
import { geolocationErrorMessage } from "./location-message.ts";

function positionError(code: number): GeolocationPositionError {
  return { code, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
}

test("위치 권한 거절 원인을 브라우저 설정 안내로 변환한다", () => {
  assert.match(geolocationErrorMessage(positionError(1)), /위치 아이콘/);
});

test("위치 확인 실패와 시간 초과를 구분한다", () => {
  assert.match(geolocationErrorMessage(positionError(2)), /위치 서비스/);
  assert.match(geolocationErrorMessage(positionError(3)), /시간이 초과/);
});
