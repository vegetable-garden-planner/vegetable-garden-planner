"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  hasResource,
  LOADING,
  loadResource,
  readResource,
  reloadResource,
  subscribeResource,
  type ResourceState,
} from "@/shared/infrastructure/resource-cache";

export type { ResourceState };
export { clearCachedResources } from "@/shared/infrastructure/resource-cache";

/**
 * 같은 key를 쓰는 조회를 앱 전체에서 한 번만 요청하고 결과를 공유합니다.
 * 화면을 이동해도 캐시가 남아 있어 같은 목록을 다시 내려받지 않습니다.
 */
export function useCachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallbackMessage: string,
): { state: ResourceState<T>; reload: () => Promise<void> } {
  const state = useSyncExternalStore(
    useCallback((notify: () => void) => subscribeResource(key, notify), [key]),
    useCallback(() => readResource<T>(key), [key]),
    useCallback(() => LOADING as ResourceState<T>, []),
  );

  useEffect(() => {
    if (!hasResource(key)) void loadResource(key, fetcher, fallbackMessage);
    // fetcher는 호출부에서 매번 새로 만들어지므로 의존성에서 제외하고 key로 자원을 식별합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(
    () => reloadResource(key, fetcher, fallbackMessage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return { state, reload };
}
