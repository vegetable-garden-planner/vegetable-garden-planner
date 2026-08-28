const STORAGE_CHANGE_EVENT = "simeobom:storage-change";

export function notifyBrowserStorageChange(storageKey: string) {
  window.dispatchEvent(
    new CustomEvent<string>(STORAGE_CHANGE_EVENT, { detail: storageKey }),
  );
}

export function subscribeToBrowserStorage(
  storageKey: string,
  onStoreChange: () => void,
) {
  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey) onStoreChange();
  }

  function handleLocalChange(event: Event) {
    if (event instanceof CustomEvent && event.detail === storageKey) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_CHANGE_EVENT, handleLocalChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_CHANGE_EVENT, handleLocalChange);
  };
}
