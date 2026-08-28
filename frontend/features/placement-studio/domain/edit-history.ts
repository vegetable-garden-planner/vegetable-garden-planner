/**
 * 편집 되돌리기
 *
 * 저장 전 편집 상태만 다룬다. 서버에 저장된 내용을 되돌리지 않는다.
 * 되돌리기를 눌러도 API 요청이 나가지 않고, 저장 버튼을 눌렀을 때의
 * 현재 상태만 서버로 간다.
 */
export interface EditHistory<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
}

const MAX_STEPS = 60;

export function createHistory<T>(present: T): EditHistory<T> {
  return { past: [], present, future: [] };
}

export function pushHistory<T>(history: EditHistory<T>, next: T): EditHistory<T> {
  return {
    past: [...history.past, history.present].slice(-MAX_STEPS),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: EditHistory<T>): EditHistory<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, MAX_STEPS),
  };
}

export function redoHistory<T>(history: EditHistory<T>): EditHistory<T> {
  if (history.future.length === 0) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present].slice(-MAX_STEPS),
    present: next,
    future: rest,
  };
}

export function canUndo<T>(history: EditHistory<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: EditHistory<T>): boolean {
  return history.future.length > 0;
}

/** 저장 직후처럼, 기준점을 새로 잡을 때 쓴다. */
export function resetHistory<T>(present: T): EditHistory<T> {
  return createHistory(present);
}
