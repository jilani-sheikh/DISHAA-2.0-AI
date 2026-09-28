import { MapContainer, TileLayer } from 'react-leaflet';
import type { Coordinates, PinPoint, Place, RouteResponse } from '../../types';
import type { RouteOption, StepMilestone } from '../../lib/campusData';
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
  multiRoutes?: RouteOption[];
  activeRouteIndex?: number;
  milestones?: StepMilestone[];
  currentStepIndex?: number;
  resetVersion: number;
  isFollowMode?: boolean;
  onFollowModeChange?: (active: boolean) => void;
  onSelectPlace: (place: Place) => void;
  onNavigateToPlace?: (place: Place) => void;
  onOpenIndoorViewer?: (block: string, floor: number) => void;
  categoryFilter?: string;
  onMapClick: (coordinates: Coordinates) => void;
  onSetDestination: () => void;
  onNavigate: () => void;
  isArrived?: boolean;
  arrivalLocation?: Coordinates | null;
}

export function CampusMap({
  places,
  selectedPlace,
  currentLocation,
  locationAccuracy,
  originPin,
  destinationPin,
  route,
  routeCoordinates,
  multiRoutes,
  activeRouteIndex,
  milestones,
  currentStepIndex,
  resetVersion,
  isFollowMode,
  onFollowModeChange,
  onSelectPlace,
  onNavigateToPlace,
  onOpenIndoorViewer,
  categoryFilter = 'academic',
  onMapClick,
  onSetDestination,
  onNavigate,
  isArrived = false,
  arrivalLocation = null,
}: CampusMapProps) {
  return (
    <MapContainer center={campusCenter} zoom={campusZoom} zoomControl={false} className="campus-map" aria-label="Interactive campus map">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        maxZoom={20}
      />
      <PlaceMarkers
        places={places}
        onSelect={onSelectPlace}
        onNavigateToPlace={onNavigateToPlace}
        onOpenIndoorViewer={onOpenIndoorViewer}
        categoryFilter={categoryFilter}
      />
      <UserLocationLayer
        initialLocation={currentLocation}
        initialAccuracy={locationAccuracy}
        isFollowMode={isFollowMode}
        onFollowModeChange={onFollowModeChange}
        navigationActive={Boolean(route || (multiRoutes && multiRoutes.length > 0))}
        isArrived={isArrived}
        arrivalLocation={arrivalLocation}
      />
      <MapInteraction
        originPin={originPin}
        destinationPin={destinationPin}
        routeActive={Boolean(route || (multiRoutes && multiRoutes.length > 0))}
        onMapClick={onMapClick}
        onSetDestination={onSetDestination}
        onNavigate={onNavigate}
      />
      <RouteLayer
        route={route}
        coordinates={routeCoordinates}
        routes={multiRoutes}
        activeRouteIndex={activeRouteIndex}
        milestones={milestones}
        currentStepIndex={currentStepIndex}
      />
      <MapViewport selectedPlace={selectedPlace} routeCoordinates={routeCoordinates} resetVersion={resetVersion} />
    </MapContainer>
  );
}
