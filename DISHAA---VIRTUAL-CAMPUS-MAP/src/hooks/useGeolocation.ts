import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from '../types';

/**
 * Live browser geolocation for DISHAA.
 *
 * `requestLocation()` starts a continuous `watchPosition` session so the
 * current-location marker keeps updating as the user moves around campus.
 * It resolves with the first accurate fix (for one-shot callers such as
 * "places near me"), while tracking continues in the background until the
 * hook unmounts or `stopTracking()` is called.
 */
export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const isMounted = useRef(true);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearWatch();
    };
  }, [clearWatch]);

  const stopTracking = useCallback(() => {
    clearWatch();
    if (isMounted.current) setIsTracking(false);
  }, [clearWatch]);

  const requestLocation = useCallback(() => new Promise<Coordinates | null>((resolve) => {
    if (!navigator.geolocation) {
      setError('This browser does not support current location.');
      resolve(null);
      return;
    }

    setIsLocating(true);
    setError(null);

    // Restart the watch so we always begin from a fresh, high-accuracy session.
    clearWatch();

    let settled = false;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (isMounted.current) {
          setCoordinates(nextCoordinates);
          setAccuracy(Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null);
          setIsTracking(true);
          setIsLocating(false);
          setError(null);
        }
        if (!settled) {
          settled = true;
          resolve(nextCoordinates);
        }
      },
      (positionError) => {
        const message = positionError.code === positionError.PERMISSION_DENIED
          ? 'Location permission was not granted. Choose a campus place as your start.'
          : 'Your location is currently unavailable. Choose a campus place as your start.';
        if (isMounted.current) {
          setError(message);
          setIsLocating(false);
          setIsTracking(false);
        }
        clearWatch();
        if (!settled) {
          settled = true;
          resolve(null);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }), [clearWatch]);

  return { coordinates, accuracy, isLocating, isTracking, error, requestLocation, stopTracking };
}
