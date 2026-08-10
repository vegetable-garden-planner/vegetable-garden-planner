import type { CropReference, CropSource } from "@/features/crop-catalog/domain/crop-reference";
import { apiRequest } from "@/shared/infrastructure/api-client";

interface CropListResponse { data: CropReference[] }
interface CropSourceListResponse { data: CropSource[] }

export async function fetchCropCatalog(): Promise<{
  crops: CropReference[];
  sources: CropSource[];
}> {
  const [cropResponse, sourceResponse] = await Promise.all([
    apiRequest<CropListResponse>("/crops?perPage=100"),
    apiRequest<CropSourceListResponse>("/crop-sources"),
  ]);
  return { crops: cropResponse.data, sources: sourceResponse.data };
}
