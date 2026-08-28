/**
 * 끌기 한 번
 *
 * setPointerCapture 를 쓰지 않는다. 포인터를 잡아 두면 손을 뗀 뒤의 click 이
 * 잡은 요소로 넘어가서 칸 선택이 먹지 않기 때문이다.
 * 대신 window 에 잠깐 붙였다가 손을 떼면 바로 떼어 낸다. 마우스·터치·펜 모두 같다.
 */
export function dragOnWindow(handlers: {
  onMove: (event: PointerEvent) => void;
  onEnd: (event: PointerEvent) => void;
}): void {
  function move(event: PointerEvent) {
    handlers.onMove(event);
  }

  function end(event: PointerEvent) {
    stop();
    handlers.onEnd(event);
  }

  function stop() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}
