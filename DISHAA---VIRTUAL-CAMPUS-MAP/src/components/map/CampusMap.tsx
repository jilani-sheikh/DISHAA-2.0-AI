import { MapContainer, TileLayer } from 'react-leaflet';
import type { Coordinates, PinPoint, Place, RouteResponse } from '../../types';
import { MapInteraction } from './MapInteraction';
import { MapViewport, campusCenter, campusZoom } from './MapViewport';
import { PlaceMarkers } from './PlaceMarkers';
import { RouteLayer } from './RouteLayer';
import { UserLocationLayer } from './UserLocationLayer';

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
  isFollowMode?: boolean;
  onFollowModeChange?: (active: boolean) => void;
  onSelectPlace: (place: Place) => void;
  onMapClick: (coordinates: Coordinates) => void;
  onSetDestination: () => void;
  onNavigate: () => void;
  isArrived?: boolean;
  arrivalLocation?: Coordinates | null;
}

export function CampusMap({
  places, selectedPlace, currentLocation, locationAccuracy, originPin, destinationPin,
  route, routeCoordinates, resetVersion, isFollowMode, onFollowModeChange, onSelectPlace, onMapClick, onSetDestination, onNavigate,
  isArrived = false, arrivalLocation = null,
}: CampusMapProps) {
  return (
    <MapContainer center={campusCenter} zoom={campusZoom} zoomControl={false} className="campus-map" aria-label="Interactive campus map">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        maxZoom={20}
      />
      <PlaceMarkers places={places} onSelect={onSelectPlace} />
      <UserLocationLayer
        initialLocation={currentLocation}
        initialAccuracy={locationAccuracy}
        isFollowMode={isFollowMode}
        onFollowModeChange={onFollowModeChange}
        navigationActive={Boolean(route)}
        isArrived={isArrived}
        arrivalLocation={arrivalLocation}
      />
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

