import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { Coordinates, Place, RouteResponse } from '../../types';
import { MapViewport, campusCenter, campusZoom } from './MapViewport';
import { PlaceMarkers } from './PlaceMarkers';
import { RouteLayer } from './RouteLayer';

interface CampusMapProps {
  places: Place[];
  selectedPlace: Place | null;
  currentLocation: Coordinates | null;
  route: RouteResponse | null;
  routeCoordinates: Coordinates[];
  resetVersion: number;
  onSelectPlace: (place: Place) => void;
}

const currentLocationIcon = divIcon({
  className: 'point-icon-wrapper',
  html: '<span class="current-location-marker"></span>',
  iconSize: [17, 17],
  iconAnchor: [8, 8],
});

export function CampusMap({
  places, selectedPlace, currentLocation, route, routeCoordinates, resetVersion, onSelectPlace,
}: CampusMapProps) {
  return (
    <MapContainer center={campusCenter} zoom={campusZoom} zoomControl={false} className="campus-map" aria-label="Interactive campus map">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        maxZoom={20}
      />
      <PlaceMarkers places={places} onSelect={onSelectPlace} />
      {currentLocation && <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon} />}
      <RouteLayer route={route} coordinates={routeCoordinates} />
      <MapViewport selectedPlace={selectedPlace} routeCoordinates={routeCoordinates} resetVersion={resetVersion} />
    </MapContainer>
  );
}
