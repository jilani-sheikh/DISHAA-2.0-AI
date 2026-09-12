import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveGuidance, getLatestNavigationContext } from './hooks/useLiveGuidance';
import { CampusMap } from './components/map/CampusMap';
import { AssistantWidget } from './components/assistant/AssistantWidget';
import { IndoorMapDialog } from './components/layout/IndoorMapDialog';
import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { Toast } from './components/layout/Toast';
import { FloatingControls } from './components/layout/FloatingControls';
import { NavigationPanel, CURRENT_LOCATION, MAP_ORIGIN, MAP_DESTINATION } from './components/navigation/NavigationPanel';
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
import { useVoiceNavigation } from './hooks/useVoiceNavigation';
import type { AssistantActions } from './hooks/useAssistant';
import type { NavPoint } from './hooks/useNavigation';
import { placesApi } from './services/api/placesApi';
import type { Coordinates, PinPoint, Place } from './types';
import { findNearestPlace } from './utils/geo';
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
  const [originPin, setOriginPin] = useState<PinPoint | null>(null);
  const [destinationPin, setDestinationPin] = useState<PinPoint | null>(null);
  const [selectTarget, setSelectTarget] = useState<'origin' | 'destination' | null>(null);
  const [isIndoorMapsOpen, setIsIndoorMapsOpen] = useState(false);
  const [mapResetVersion, setMapResetVersion] = useState(0);
  const [isFollowMode, setIsFollowMode] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [liveInstruction, setLiveInstruction] = useState<string | null>(null);
  const [liveRemainingMeters, setLiveRemainingMeters] = useState<number | null>(null);
  const [isArrived, setIsArrived] = useState(false);
  const [arrivalLocation, setArrivalLocation] = useState<Coordinates | null>(null);
  
  const {
    isEnabled: isVoiceEnabled,
    isSpeaking: isVoiceSpeaking,
    toggleVoice,
    initVoice,
    speak: speakVoice,
    stopSession: stopVoiceSession,
  } = useVoiceNavigation();

  const selectedPlaceForDisplay = selectedPlaceDetail || selectedPlace;
  const routeCoordinates = useMemo(() => decodePolyline(route?.route.encodedShape || null), [route?.route.encodedShape]);

  useEffect(() => {
    setIsArrived(false);
    setArrivalLocation(null);
  }, [route]);

  useEffect(() => {
    if (!locationError) return;
    setToast({ message: locationError, isError: true });
  }, [locationError]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Show a crosshair cursor over the map while a map-point selection is armed.
  useEffect(() => {
    document.body.classList.toggle('dishaa-selecting', selectTarget !== null);
    return () => document.body.classList.remove('dishaa-selecting');
  }, [selectTarget]);

  const selectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  const locateUser = useCallback(async () => {
    setIsFollowMode(true);
    const coordinates = await requestLocation();
    if (!coordinates) return;

    try {
      const nearby = await findNearby(coordinates);
      setToast({ message: `${nearby.length} campus places found near you.`, isError: false });
    } catch {
      setToast({ message: 'Current location set. Choose a destination to begin.', isError: false });
    }
  }, [findNearby, requestLocation]);

  const resolveOrigin = useCallback((originId: string): NavPoint | null => {
    if (originId === CURRENT_LOCATION) {
      return currentLocation ? { kind: 'current', coordinates: currentLocation } : null;
    }
    if (originId === MAP_ORIGIN) {
      if (!originPin) return null;
      return originPin.place
        ? { kind: 'place', place: originPin.place }
        : { kind: 'pin', coordinates: originPin.coordinates, label: 'Selected start' };
    }
    const place = places.find((item) => item.id === originId);
    return place ? { kind: 'place', place } : null;
  }, [currentLocation, originPin, places]);

  const resolveDestination = useCallback((destinationId: string): NavPoint | null => {
    if (destinationId === MAP_DESTINATION) {
      if (!destinationPin) return null;
      return destinationPin.place
        ? { kind: 'place', place: destinationPin.place }
        : { kind: 'pin', coordinates: destinationPin.coordinates, label: 'Selected location' };
    }
    const place = places.find((item) => item.id === destinationId);
    return place ? { kind: 'place', place } : null;
  }, [destinationPin, places]);

  const startNavigation = useCallback(async (originId: string, destinationId: string) => {
    // Unlock native speech audio context via user interaction gesture
    initVoice();

    const destination = resolveDestination(destinationId);
    if (!destination) {
      setToast({ message: 'Choose a destination to start navigation.', isError: true });
      return;
    }
    const origin = resolveOrigin(originId);
    if (!origin) {
      setToast({
        message: originId === CURRENT_LOCATION
          ? 'Use your current location before starting this route.'
          : 'Choose where you are starting from.',
        isError: true,
      });
      return;
    }
    setIsFollowMode(true);
    setIsArrived(false);
    setArrivalLocation(null);
    await calculateRoute(origin, destination);
  }, [calculateRoute, initVoice, resolveDestination, resolveOrigin]);

  const openNavigationForSelectedPlace = useCallback(() => {
    if (selectedPlace) setIsNavigationOpen(true);
  }, [selectedPlace]);

  const clearActiveRoute = useCallback(() => {
    stopVoiceSession();
    clearRoute();
    setIsNavigationOpen(false);
    setIsFollowMode(false);
    setIsArrived(false);
    setArrivalLocation(null);
    setOriginPin(null);
    setDestinationPin(null);
    setSelectTarget(null);
    setLiveInstruction(null);
    setLiveRemainingMeters(null);
  }, [clearRoute, stopVoiceSession]);


  const pickOnMap = useCallback((target: 'origin' | 'destination') => {
    setSelectTarget(target);
    setToast({
      message: target === 'origin'
        ? 'Tap the map to set your start point.'
        : 'Tap the map to choose your destination.',
      isError: false,
    });
  }, []);

  // Map background clicks drop a start or destination pin, matched to a real
  // campus POI when one is close enough. Never invents place data.
  const handleMapClick = useCallback((coordinates: Coordinates) => {
    const place = findNearestPlace(coordinates, places, 25);
    const pin: PinPoint = { coordinates, place };
    if (selectTarget === 'origin') {
      setOriginPin(pin);
      setToast({ message: place ? `Start set to ${place.name}.` : 'Start point set on the map.', isError: false });
    } else {
      setDestinationPin(pin);
    }
    setSelectTarget(null);
    setIsNavigationOpen(true);
  }, [places, selectTarget]);

  const setPinAsDestination = useCallback(() => {
    setSelectTarget(null);
    setIsNavigationOpen(true);
    setToast({ message: 'Destination set. Start navigation when ready.', isError: false });
  }, []);

  const navigateFromPin = useCallback(async () => {
    if (!destinationPin) return;
    const destination: NavPoint = destinationPin.place
      ? { kind: 'place', place: destinationPin.place }
      : { kind: 'pin', coordinates: destinationPin.coordinates, label: 'Selected location' };

    let origin: NavPoint | null = null;
    if (originPin) {
      origin = originPin.place
        ? { kind: 'place', place: originPin.place }
        : { kind: 'pin', coordinates: originPin.coordinates, label: 'Selected start' };
    } else {
      const coordinates = currentLocation ?? (await requestLocation());
      if (!coordinates) {
        setToast({ message: 'Enable location or pick a start point on the map.', isError: true });
        return;
      }
      origin = { kind: 'current', coordinates };
    }

    setIsNavigationOpen(true);
    await calculateRoute(origin, destination);
  }, [calculateRoute, currentLocation, destinationPin, originPin, requestLocation]);

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
    await calculateRoute({ kind: 'current', coordinates: origin }, { kind: 'place', place: destination });
  }, [calculateRoute, currentLocation, requestLocation]);

  const navigateBetweenPlacesFromAssistant = useCallback(async (origin: Place, destination: Place) => {
    setSelectedPlace(destination);
    setIsNavigationOpen(true);
    await calculateRoute({ kind: 'place', place: origin }, { kind: 'place', place: destination });
  }, [calculateRoute]);

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
    navigateBetweenPlaces: navigateBetweenPlacesFromAssistant,
    findNearby: async () => {
      const coordinates = await requestLocation();
      if (!coordinates) throw new Error('location-unavailable');
      return findNearby(coordinates);
    },
    getContext: () => ({
      currentLocation,
      currentPlace: selectedPlace ?? (currentLocation ? findNearestPlace(currentLocation, places, 50) ?? null : null),
      destination: destinationPin?.place ?? selectedPlace ?? null,
      navigationActive: Boolean(route),
      route: route ?? null,
      navigationContext: getLatestNavigationContext(),
    }),
  }), [currentLocation, destinationPin, findNearby, navigateBetweenPlacesFromAssistant, navigateFromAssistant, places, requestLocation, route, selectedPlace]);

  // Live guidance hook — with native SpeechSynthesis priority queue
  useLiveGuidance({
    route,
    currentLocation,
    places,
    speak: (text: string, priority, dedupeKey) => {
      speakVoice(text, priority, dedupeKey);
    },
    onInstruction: (text: string | null, remaining?: number | null) => {
      setLiveInstruction(text ?? null);
      setLiveRemainingMeters(typeof remaining === 'number' ? remaining : null);
    },
    onOffRoute: () => {
      setToast({ message: 'You appear to be off the route. Recalculating…', isError: false });
    },
    onArrived: (loc?: Coordinates) => {
      setIsArrived(true);
      if (loc) {
        setArrivalLocation(loc);
      }
      setToast({ message: `You have arrived at ${route?.to?.name || 'your destination'}.`, isError: false });
    },
    recalcRoute: async () => {
      // Attempt to recalculate a fresh route using the current live coordinates and the existing destination.
      if (!currentLocation || !route) return;
      try {
        await calculateRoute({ kind: 'current', coordinates: currentLocation }, { kind: 'place', place: { id: route.to.id, name: route.to.name, category: route.to.category, subcategory: route.to.category, description: '', location: { lat: route.to.lat, lng: route.to.lng, type: 'Point', coordinates: [route.to.lng, route.to.lat] } } as any });
      } catch (_) {}
    },
  });

  return (
    <AppShell>
      <CampusMap
        places={visiblePlaces}
        selectedPlace={selectedPlace}
        currentLocation={currentLocation}
        locationAccuracy={locationAccuracy}
        originPin={originPin}
        destinationPin={destinationPin}
        route={route}
        routeCoordinates={routeCoordinates}
        resetVersion={mapResetVersion}
        isFollowMode={isFollowMode}
        onFollowModeChange={setIsFollowMode}
        onSelectPlace={selectPlace}
        onMapClick={handleMapClick}
        onSetDestination={setPinAsDestination}
        onNavigate={() => void navigateFromPin()}
        isArrived={isArrived}
        arrivalLocation={arrivalLocation}
      />

      <FloatingControls onLocate={() => void locateUser()} onReset={() => setMapResetVersion((v) => v + 1)} onAssistant={() => {}} />

      <Header
        isOnline={serviceIsOnline}
        isLocating={isLocating}
        onLocate={() => void locateUser()}
        onOpenIndoorMaps={() => setIsIndoorMapsOpen(true)}
      />

      <aside className="floating-panel" aria-label="Campus explorer">
        <SearchBar onSelect={selectPlace} currentLocation={currentLocation} />
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
            currentLocation={currentLocation}
            originPinLabel={originPin ? (originPin.place ? originPin.place.name : 'Selected map point') : null}
            destinationPinLabel={destinationPin ? (destinationPin.place ? destinationPin.place.name : 'Selected map point') : null}
            defaultDestinationId={destinationPin ? MAP_DESTINATION : (selectedPlace?.id ?? '')}
            selectTarget={selectTarget}
            route={route}
            isCalculating={isCalculatingRoute}
            error={navigationError}
            onPickOnMap={pickOnMap}
            onStart={(originId, destinationId) => void startNavigation(originId, destinationId)}
            onClear={clearActiveRoute}
            nextInstruction={liveInstruction}
            remainingMeters={liveRemainingMeters}
            isVoiceEnabled={isVoiceEnabled}
            isSpeaking={isVoiceSpeaking}
            onToggleVoice={toggleVoice}
          />
        )}
      </aside>

      {selectTarget && (
        <div className="map-select-hint" role="status">
          <span>{selectTarget === 'origin' ? 'Tap the map to set your start point' : 'Tap the map to choose your destination'}</span>
          <button type="button" onClick={() => setSelectTarget(null)}>Cancel</button>
        </div>
      )}

      <div className="map-controls" aria-label="Map controls">
        <button
          className={`map-control ${isFollowMode ? 'is-active' : ''}`}
          type="button"
          title={isFollowMode ? 'Following user location' : 'Recenter on user location'}
          aria-label={isFollowMode ? 'Following user location' : 'Recenter on user location'}
          onClick={() => void locateUser()}
        >
          {isFollowMode ? '📍' : '◎'}
        </button>
        <button className="map-control" type="button" title="Reset campus view" aria-label="Reset campus view" onClick={() => setMapResetVersion((version) => version + 1)}>⌂</button>
      </div>


      <AssistantWidget actions={assistantActions} />

      <Toast message={toast?.message || null} isError={toast?.isError} />
      {isIndoorMapsOpen && <IndoorMapDialog onClose={() => setIsIndoorMapsOpen(false)} />}
    </AppShell>
  );
}
