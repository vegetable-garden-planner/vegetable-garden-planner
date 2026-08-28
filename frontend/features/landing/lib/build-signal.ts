/**
 * "계산 중" 게이지와 3D 무대를 잇는 아주 작은 신호
 *
 * 게이지는 화면에 도착하면 저절로 차오른다(스크롤과 무관).
 * 그 값에 맞춰 3D 안에서 도면이 그려지고 → 심을 자리가 찍히고 → 포기가 자란다.
 *
 * React context 를 쓰지 않는 이유는, 무대가 매 프레임 리렌더되면 안 되기 때문이다.
 * 값이 바뀔 때만 알려 주고, 무대는 그때 프레임 하나만 예약한다.
 */

let progress = 0;
const listeners = new Set<(value: number) => void>();

export function setBuildProgress(value: number) {
  const next = Math.min(1, Math.max(0, value));
  if (Math.abs(next - progress) < 0.001) return;
  progress = next;
  listeners.forEach((listener) => listener(next));
}

export function getBuildProgress() {
  return progress;
}

export function onBuildProgress(listener: (value: number) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
