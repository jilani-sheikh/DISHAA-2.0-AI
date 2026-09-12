import { useCallback, useState } from 'react';
import { navigationApi } from '../services/api/navigationApi';
import type { Coordinates, Place, RouteResponse } from '../types';

/**
 * A routing endpoint. Either the live GPS position, a real campus place, or a
 * coordinate chosen directly on the map. All three resolve to real Valhalla
 * routes via the existing Express backend — no synthetic paths.
 */
export type NavPoint =
  | { kind: 'current'; coordinates: Coordinates }
  | { kind: 'place'; place: Place }
  | { kind: 'pin'; coordinates: Coordinates; label: string };

function pointCoordinates(point: NavPoint): Coordinates {
  if (point.kind === 'place') {
    return { lat: point.place.location.lat, lng: point.place.location.lng };
  }
  return point.coordinates;
}

export function useNavigation() {
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async (origin: NavPoint, destination: NavPoint) => {
    setIsLoading(true);
    setError(null);
    try {
      // Place-to-place keeps the richer named endpoints from the backend;
      // any coordinate/pin endpoint falls back to coordinate routing.
      const response = origin.kind === 'place' && destination.kind === 'place'
        ? await navigationApi.routeBetweenPlaces(origin.place.id, destination.place.id)
        : await navigationApi.routeByCoordinates(pointCoordinates(origin), pointCoordinates(destination));
      setRoute(response);
      return response;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to calculate a walking route.';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
  }, []);

  return { route, isLoading, error, calculateRoute, clearRoute };
}
