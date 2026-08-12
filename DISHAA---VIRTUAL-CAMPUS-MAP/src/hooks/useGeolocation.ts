import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from '../types';

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const requestLocation = useCallback(() => new Promise<Coordinates | null>((resolve) => {
    if (!navigator.geolocation) {
      setError('This browser does not support current location.');
      resolve(null);
      return;
    }

    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (isMounted.current) {
          setCoordinates(nextCoordinates);
          setIsLocating(false);
        }
        resolve(nextCoordinates);
      },
      (positionError) => {
        const message = positionError.code === positionError.PERMISSION_DENIED
          ? 'Location permission was not granted. Choose a campus place as your start.'
          : 'Your location could not be determined. Choose a campus place as your start.';
        if (isMounted.current) {
          setError(message);
          setIsLocating(false);
        }
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }), []);

  return { coordinates, isLocating, error, requestLocation };
}
