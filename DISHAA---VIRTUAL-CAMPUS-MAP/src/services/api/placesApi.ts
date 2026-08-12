import type { Place, PlaceDetail } from '../../types';
import { apiRequest, buildQuery } from './client';

interface PlacesResponse {
  success: true;
  count: number;
  results: Place[];
}

interface SearchResponse extends PlacesResponse {
  query: string;
}

interface PlaceResponse {
  success: true;
  result: PlaceDetail;
}

export const placesApi = {
  list: (category?: string) => apiRequest<PlacesResponse>(`/places${buildQuery({ category })}`),
  search: (query: string) => apiRequest<SearchResponse>(`/places/search${buildQuery({ q: query })}`),
  detail: (id: string) => apiRequest<PlaceResponse>(`/places/${encodeURIComponent(id)}`),
  nearby: (coordinates: { lat: number; lng: number }, radius = 400) =>
    apiRequest<PlacesResponse>(`/places/nearby${buildQuery({ ...coordinates, radius })}`),
};
