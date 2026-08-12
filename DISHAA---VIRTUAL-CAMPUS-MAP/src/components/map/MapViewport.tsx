import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { Coordinates, Place } from '../../types';

interface MapViewportProps {
  selectedPlace: Place | null;
  routeCoordinates: Coordinates[];
  resetVersion: number;
}

const campusCenter: [number, number] = [21.12455, 79.00295];
const campusZoom = 17;

export function MapViewport({ selectedPlace, routeCoordinates, resetVersion }: MapViewportProps) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates.map((point) => [point.lat, point.lng]), { padding: [70, 70], maxZoom: 18 });
    }
  }, [map, routeCoordinates]);

  useEffect(() => {
    if (selectedPlace && routeCoordinates.length < 2) {
      map.flyTo([selectedPlace.location.lat, selectedPlace.location.lng], Math.max(map.getZoom(), 18), { duration: 0.55 });
    }
  }, [map, routeCoordinates.length, selectedPlace]);

  useEffect(() => {
    if (resetVersion > 0) map.flyTo(campusCenter, campusZoom, { duration: 0.55 });
  }, [map, resetVersion]);

  return null;
}

export { campusCenter, campusZoom };
