import { useCallback, useState } from 'react';
import type { Coordinates, Place } from '../types';
import { placesApi } from '../services/api/placesApi';

export function useNearbyPlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const findNearby = useCallback(async (coordinates: Coordinates) => {
    setIsLoading(true);
    try {
      const response = await placesApi.nearby(coordinates);
      setPlaces(response.results);
      return response.results;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { places, isLoading, findNearby };
}
