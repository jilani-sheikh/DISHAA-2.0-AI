import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { Coordinates, PinPoint, Place, RouteResponse } from '../../types';
import { MapInteraction } from './MapInteraction';
import { MapViewport, campusCenter, campusZoom } from './MapViewport';
import { PlaceMarkers } from './PlaceMarkers';
import { RouteLayer } from './RouteLayer';

interface CampusMapProps {
  places: Place[];
  selectedPlace: Place | null;
  currentLocation: Coordinates | null;
  locationAccuracy: number | null;
  originPin: PinPoint | null;
  destinationPin: PinPoint | null;
  route: RouteResponse | null;
  routeCoordinates: Coordinates[];
  resetVersion: number;
  onSelectPlace: (place: Place) => void;
  onMapClick: (coordinates: Coordinates) => void;
  onSetDestination: () => void;
  onNavigate: () => void;
}

const currentLocationIcon = divIcon({
  className: 'point-icon-wrapper',
  html: '<span class="current-location-marker"></span>',
  iconSize: [17, 17],
  iconAnchor: [8, 8],
});

export function CampusMap({
  places, selectedPlace, currentLocation, locationAccuracy, originPin, destinationPin,
  route, routeCoordinates, resetVersion, onSelectPlace, onMapClick, onSetDestination, onNavigate,
}: CampusMapProps) {
  return (
    <MapContainer center={campusCenter} zoom={campusZoom} zoomControl={false} className="campus-map" aria-label="Interactive campus map">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        maxZoom={20}
      />
      <PlaceMarkers places={places} onSelect={onSelectPlace} />
      {currentLocation && locationAccuracy && locationAccuracy > 0 && (
        <Circle
          center={[currentLocation.lat, currentLocation.lng]}
          radius={locationAccuracy}
          pathOptions={{ color: '#3d75b4', weight: 1, opacity: 0.5, fillColor: '#3d75b4', fillOpacity: 0.12 }}
        />
      )}
      {currentLocation && <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon} />}
      <MapInteraction
        originPin={originPin}
        destinationPin={destinationPin}
        routeActive={Boolean(route)}
        onMapClick={onMapClick}
        onSetDestination={onSetDestination}
        onNavigate={onNavigate}
      />
      <RouteLayer route={route} coordinates={routeCoordinates} />
      <MapViewport selectedPlace={selectedPlace} routeCoordinates={routeCoordinates} resetVersion={resetVersion} />
    </MapContainer>
  );
}
