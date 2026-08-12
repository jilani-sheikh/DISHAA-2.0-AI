import { useEffect, useState } from 'react';
import type { Place } from '../types';
import { placesApi } from '../services/api/placesApi';

export function useSearch(query: string) {
  const [results, setResults] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await placesApi.search(normalizedQuery);
        if (isCurrent) setResults(response.results);
      } catch (requestError) {
        if (isCurrent) {
          setResults([]);
          setError(requestError instanceof Error ? requestError.message : 'Search is currently unavailable.');
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return { results, isLoading, error };
}
