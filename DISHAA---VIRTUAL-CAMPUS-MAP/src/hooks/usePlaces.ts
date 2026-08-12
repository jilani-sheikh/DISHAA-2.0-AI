import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Place } from '../types';
import { placesApi } from '../services/api/placesApi';

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await placesApi.list();
      setPlaces(response.results);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Campus places could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const visiblePlaces = useMemo(
    () => (category ? places.filter((place) => place.category === category) : places),
    [category, places],
  );

  return { places, visiblePlaces, category, setCategory, isLoading, error, reload: loadPlaces };
}
