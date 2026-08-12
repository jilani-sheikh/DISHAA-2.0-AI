import { useCallback, useEffect, useMemo, useState } from 'react';
import { CampusMap } from './components/map/CampusMap';
import { AssistantWidget } from './components/assistant/AssistantWidget';
import { IndoorMapDialog } from './components/layout/IndoorMapDialog';
import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { Toast } from './components/layout/Toast';
import { NavigationPanel, CURRENT_LOCATION } from './components/navigation/NavigationPanel';
import { NearbyPlaces } from './components/places/NearbyPlaces';
import { PlaceDetails } from './components/places/PlaceDetails';
import { CategoryFilters } from './components/search/CategoryFilters';
import { SearchBar } from './components/search/SearchBar';
import { useGeolocation } from './hooks/useGeolocation';
import { useHealth } from './hooks/useHealth';
import { useNavigation } from './hooks/useNavigation';
import { useNearbyPlaces } from './hooks/useNearbyPlaces';
import { usePlaceDetails } from './hooks/usePlaceDetails';
import { usePlaces } from './hooks/usePlaces';
import type { AssistantActions } from './hooks/useAssistant';
import { placesApi } from './services/api/placesApi';
import type { Place } from './types';
import { decodePolyline } from './utils/polyline';

interface ToastState {
  message: string;
  isError: boolean;
}

export default function App() {
  const { places, visiblePlaces, category, setCategory, isLoading: arePlacesLoading, error: placesError, reload } = usePlaces();
  const serviceIsOnline = useHealth();
  const { coordinates: currentLocation, accuracy: locationAccuracy, isLocating, error: locationError, requestLocation } = useGeolocation();
  const { places: nearbyPlaces, findNearby } = useNearbyPlaces();
  const { route, isLoading: isCalculatingRoute, error: navigationError, calculateRoute, clearRoute } = useNavigation();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const selectedPlaceDetail = usePlaceDetails(selectedPlace?.id);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isIndoorMapsOpen, setIsIndoorMapsOpen] = useState(false);
  const [mapResetVersion, setMapResetVersion] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  const selectedPlaceForDisplay = selectedPlaceDetail || selectedPlace;
  const routeCoordinates = useMemo(() => decodePolyline(route?.route.encodedShape || null), [route?.route.encodedShape]);

  useEffect(() => {
    if (!locationError) return;
    setToast({ message: locationError, isError: true });
  }, [locationError]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const locateUser = useCallback(async () => {
    const coordinates = await requestLocation();
    if (!coordinates) return;

    try {
      const nearby = await findNearby(coordinates);
      setToast({ message: `${nearby.length} campus places found near you.`, isError: false });
    } catch {
      setToast({ message: 'Current location set. Choose a destination to begin.', isError: false });
    }
  }, [findNearby, requestLocation]);

  const startNavigation = useCallback(async (originId: string, destinationId: string) => {
    const destination = places.find((place) => place.id === destinationId);
    if (!destination) {
      setToast({ message: 'Choose a destination to start navigation.', isError: true });
      return;
    }

    if (originId === CURRENT_LOCATION) {
      if (!currentLocation) {
        setToast({ message: 'Use your current location before starting this route.', isError: true });
        return;
      }
      await calculateRoute({ kind: 'current', coordinates: currentLocation }, destination);
      return;
    }

    const originPlace = places.find((place) => place.id === originId);
    if (!originPlace) {
      setToast({ message: 'Choose where you are starting from.', isError: true });
      return;
    }
    if (originPlace.id === destination.id) {
      setToast({ message: 'Choose two different campus locations.', isError: true });
      return;
    }
    await calculateRoute({ kind: 'place', place: originPlace }, destination);
  }, [calculateRoute, currentLocation, places]);

  const openNavigationForSelectedPlace = useCallback(() => {
    if (selectedPlace) setIsNavigationOpen(true);
  }, [selectedPlace]);

  const clearActiveRoute = useCallback(() => {
    clearRoute();
    setIsNavigationOpen(false);
  }, [clearRoute]);

  // Real backend-backed actions exposed to the DISHAA assistant. A future AI
  // agent drives this exact surface; nothing here uses mock campus data.
  const navigateFromAssistant = useCallback(async (destination: Place) => {
    setSelectedPlace(destination);
    let origin = currentLocation;
    if (!origin) origin = await requestLocation();
    if (!origin) {
      setIsNavigationOpen(true);
      setToast({ message: 'Enable location to walk there, or pick a start point.', isError: true });
      return;
    }
    setIsNavigationOpen(true);
    await calculateRoute({ kind: 'current', coordinates: origin }, destination);
  }, [calculateRoute, currentLocation, requestLocation]);

  const assistantActions = useMemo<AssistantActions>(() => ({
    searchPlaces: async (query: string) => {
      const response = await placesApi.search(query);
      return response.results;
    },
    showPlace: (place: Place) => {
      setIsNavigationOpen(false);
      setSelectedPlace(place);
    },
    navigateTo: navigateFromAssistant,
    findNearby: async () => {
      const coordinates = await requestLocation();
      if (!coordinates) throw new Error('location-unavailable');
      return findNearby(coordinates);
    },
  }), [findNearby, navigateFromAssistant, requestLocation]);

  return (
    <AppShell>
      <CampusMap
        places={visiblePlaces}
        selectedPlace={selectedPlace}
        currentLocation={currentLocation}
        locationAccuracy={locationAccuracy}
        route={route}
        routeCoordinates={routeCoordinates}
        resetVersion={mapResetVersion}
        onSelectPlace={selectPlace}
      />

      <Header
        isOnline={serviceIsOnline}
        isLocating={isLocating}
        onLocate={() => void locateUser()}
        onOpenIndoorMaps={() => setIsIndoorMapsOpen(true)}
      />

      <aside className="floating-panel" aria-label="Campus explorer">
        <SearchBar onSelect={selectPlace} />
        <CategoryFilters category={category} onChange={setCategory} />

        {arePlacesLoading && <div className="panel-state"><span className="loading-ring" aria-hidden="true" /> Loading campus places</div>}
        {placesError && (
          <div className="panel-state is-error">
            <p>Campus places could not be loaded.</p>
            <button type="button" className="secondary-button" onClick={() => void reload()}>Try again</button>
          </div>
        )}

        {!arePlacesLoading && !placesError && !selectedPlaceForDisplay && !isNavigationOpen && (
          <section className="welcome-card">
            <p className="eyebrow">Welcome to campus</p>
            <h1>Find your next stop with confidence.</h1>
            <p>Search a place, choose a category, or select a marker to get directions.</p>
            <button className="secondary-button" type="button" onClick={() => void locateUser()} disabled={isLocating}>
              {isLocating ? 'Locating you…' : 'Places near me'}
            </button>
          </section>
        )}

        {selectedPlaceForDisplay && !isNavigationOpen && (
          <PlaceDetails
            place={selectedPlaceForDisplay}
            onClose={() => setSelectedPlace(null)}
            onNavigate={openNavigationForSelectedPlace}
          />
        )}

        {!isNavigationOpen && <NearbyPlaces places={nearbyPlaces} onSelect={selectPlace} />}

        {isNavigationOpen && (
          <NavigationPanel
            places={places}
            destinationId={selectedPlace?.id}
            currentLocation={currentLocation}
            route={route}
            isCalculating={isCalculatingRoute}
            error={navigationError}
            onStart={(originId, destinationId) => void startNavigation(originId, destinationId)}
            onClear={clearActiveRoute}
          />
        )}
      </aside>

      <div className="map-controls" aria-label="Map controls">
        <button className="map-control" type="button" title="Reset campus view" aria-label="Reset campus view" onClick={() => setMapResetVersion((version) => version + 1)}>⌂</button>
      </div>

      <AssistantWidget actions={assistantActions} />

      <Toast message={toast?.message || null} isError={toast?.isError} />
      {isIndoorMapsOpen && <IndoorMapDialog onClose={() => setIsIndoorMapsOpen(false)} />}
    </AppShell>
  );
}
