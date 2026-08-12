import type { Coordinates, RouteResponse } from '../../types';
import { apiRequest } from './client';

export const navigationApi = {
  routeByCoordinates: (start: Coordinates, destination: Coordinates) =>
    apiRequest<RouteResponse>('/navigation/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { start, destination },
    }),
  routeBetweenPlaces: (from: string, to: string) =>
    apiRequest<RouteResponse>('/navigation/route-between-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { from, to },
    }),
};
