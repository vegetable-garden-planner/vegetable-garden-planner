import { apiRequest } from "@/shared/infrastructure/api-client";

export interface GeocodedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

interface GeocodeResponse {
  data: GeocodedLocation;
}

export async function geocodeAddress(address: string): Promise<GeocodedLocation> {
  const query = new URLSearchParams({ address });
  return (await apiRequest<GeocodeResponse>(`/locations/geocode?${query.toString()}`)).data;
}
