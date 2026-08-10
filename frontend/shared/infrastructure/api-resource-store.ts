export const API_DATA_CHANGE_EVENT = "simeobom:api-data-change";

export type ApiResourceState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

export function createApiResourceStore<T>(loader: () => Promise<T>) {
  const loadingState: ApiResourceState<T> = { status: "loading" };
  let state: ApiResourceState<T> = loadingState;
  let started = false;
  let activeRequest = 0;
  const listeners = new Set<() => void>();

  async function load() {
    const requestId = ++activeRequest;
    try {
      const data = await loader();
      if (requestId === activeRequest) {
        state = { status: "ready", data };
        emit();
      }
    } catch (error) {
      if (requestId === activeRequest) {
        state = {
          status: "error",
          message: error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.",
        };
        emit();
      }
    }
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function onDataChange() {
    void load();
  }

  return {
    getSnapshot: () => state,
    getServerSnapshot: (): ApiResourceState<T> => loadingState,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!started) {
        started = true;
        window.addEventListener(API_DATA_CHANGE_EVENT, onDataChange);
        void load();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener(API_DATA_CHANGE_EVENT, onDataChange);
          started = false;
        }
      };
    },
    reload: load,
  };
}

export function notifyApiDataChanged() {
  window.dispatchEvent(new Event(API_DATA_CHANGE_EVENT));
}
