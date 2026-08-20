export type ResourceState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

export const LOADING: ResourceState<never> = { status: "loading" };

const cache = new Map<string, ResourceState<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();

export function readResource<T>(key: string): ResourceState<T> {
  return (cache.get(key) as ResourceState<T> | undefined) ?? LOADING;
}

export function hasResource(key: string): boolean {
  return cache.has(key);
}

export function subscribeResource(key: string, notify: () => void): () => void {
  let keyListeners = listeners.get(key);
  if (!keyListeners) {
    keyListeners = new Set();
    listeners.set(key, keyListeners);
  }
  keyListeners.add(notify);
  return () => { keyListeners.delete(notify); };
}

function publish<T>(key: string, state: ResourceState<T>): void {
  cache.set(key, state);
  listeners.get(key)?.forEach((notify) => notify());
}

/** 같은 key로 이미 요청이 진행 중이면 새로 보내지 않고 그 요청을 함께 기다립니다. */
export function loadResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallbackMessage: string,
): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;

  const request = fetcher().then(
    (data) => { publish<T>(key, { status: "ready", data }); },
    (error: unknown) => {
      publish<T>(key, {
        status: "error",
        message: error instanceof Error ? error.message : fallbackMessage,
      });
    },
  ).finally(() => { inflight.delete(key); });

  inflight.set(key, request);
  return request;
}

export function reloadResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallbackMessage: string,
): Promise<void> {
  cache.delete(key);
  inflight.delete(key);
  publish<T>(key, LOADING);
  return loadResource(key, fetcher, fallbackMessage);
}

/**
 * 목록을 바꾸는 요청 뒤에 호출합니다. 캐시를 버리고 구독자에게 알리면
 * 화면에 떠 있는 목록은 다시 불러오고, 없으면 다음에 열 때 불러옵니다.
 */
export function invalidateResource(key: string): void {
  cache.delete(key);
  inflight.delete(key);
  listeners.get(key)?.forEach((notify) => notify());
}

/** 로그아웃·로그인처럼 사용자가 바뀌는 시점에 이전 사용자의 캐시를 남기지 않습니다. */
export function clearCachedResources(): void {
  cache.clear();
  inflight.clear();
  listeners.forEach((keyListeners) => keyListeners.forEach((notify) => notify()));
}
