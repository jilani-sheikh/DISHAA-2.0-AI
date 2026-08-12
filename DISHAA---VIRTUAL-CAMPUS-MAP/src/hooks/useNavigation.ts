import { useCallback, useState } from 'react';
import { navigationApi } from '../services/api/navigationApi';
import type { Coordinates, Place, RouteResponse } from '../types';

type NavigationOrigin =
  | { kind: 'current'; coordinates: Coordinates }
  | { kind: 'place'; place: Place };

export function useNavigation() {
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async (origin: NavigationOrigin, destination: Place) => {
    setIsLoading(true);
    setError(null);
    setRoute(null);
    try {
      const response = origin.kind === 'current'
        ? await navigationApi.routeByCoordinates(origin.coordinates, destination.location)
        : await navigationApi.routeBetweenPlaces(origin.place.id, destination.id);
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
