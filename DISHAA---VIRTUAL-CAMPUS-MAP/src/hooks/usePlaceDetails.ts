import { useEffect, useState } from 'react';
import type { PlaceDetail } from '../types';
import { placesApi } from '../services/api/placesApi';

export function usePlaceDetails(placeId: string | undefined) {
  const [place, setPlace] = useState<PlaceDetail | null>(null);

  useEffect(() => {
    if (!placeId) {
      setPlace(null);
      return undefined;
    }

    let isCurrent = true;
    void placesApi.detail(placeId)
      .then((response) => {
        if (isCurrent) setPlace(response.result);
      })
      .catch(() => {
        if (isCurrent) setPlace(null);
      });

    return () => {
      isCurrent = false;
    };
  }, [placeId]);

  return place;
}
