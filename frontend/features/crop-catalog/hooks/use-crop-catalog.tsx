"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CropReference, CropSource } from "@/features/crop-catalog/domain/crop-reference";
import { fetchCropCatalog } from "@/features/crop-catalog/infrastructure/crop-api";

export type CropCatalogState =
  | { status: "loading"; crops: readonly []; sources: readonly [] }
  | { status: "ready"; crops: readonly CropReference[]; sources: readonly CropSource[] }
  | { status: "error"; crops: readonly []; sources: readonly []; message: string };

const CropCatalogContext = createContext<CropCatalogState | null>(null);

export function CropCatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CropCatalogState>({ status: "loading", crops: [], sources: [] });

  useEffect(() => {
    let active = true;
    void fetchCropCatalog().then(
      ({ crops, sources }) => { if (active) setState({ status: "ready", crops, sources }); },
      (error: unknown) => {
        if (active) setState({ status: "error", crops: [], sources: [], message: toMessage(error) });
      },
    );
    return () => { active = false; };
  }, []);

  const value = useMemo(() => state, [state]);
  return <CropCatalogContext.Provider value={value}>{children}</CropCatalogContext.Provider>;
}

export function useCropCatalog(): CropCatalogState {
  const context = useContext(CropCatalogContext);
  if (!context) throw new Error("CropCatalogProvider is required.");
  return context;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "작물 기준정보를 불러오지 못했습니다.";
}
