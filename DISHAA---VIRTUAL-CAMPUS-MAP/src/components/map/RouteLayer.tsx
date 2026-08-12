import { divIcon } from 'leaflet';
import { Marker, Polyline } from 'react-leaflet';
import type { Coordinates, RouteResponse } from '../../types';

interface RouteLayerProps {
  route: RouteResponse | null;
  coordinates: Coordinates[];
}

function pointIcon(className: string) {
  return divIcon({
    className: 'point-icon-wrapper',
    html: `<span class="${className}"></span>`,
    iconSize: [17, 17],
    iconAnchor: [8, 8],
  });
}

export function RouteLayer({ route, coordinates }: RouteLayerProps) {
  if (!route) return null;

  return (
    <>
      {coordinates.length > 1 && <Polyline positions={coordinates.map((point) => [point.lat, point.lng])} pathOptions={{ color: '#c38432', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />}
      <Marker position={[route.from.lat, route.from.lng]} icon={pointIcon('route-origin')} interactive={false} />
      <Marker position={[route.to.lat, route.to.lng]} icon={pointIcon('route-destination')} interactive={false} />
    </>
  );
}
