import { useEffect, useState } from 'react';
import type { Coordinates, Place, RouteResponse } from '../../types';
import { NavigationInstructions } from './NavigationInstructions';
import { RouteSummary } from './RouteSummary';
import { BottomSheet } from '../ui/BottomSheet';

const CURRENT_LOCATION = 'current-location';
const MAP_ORIGIN = 'map-origin';
const MAP_DESTINATION = 'map-destination';

interface NavigationPanelProps {
  places: Place[];
  currentLocation: Coordinates | null;
  originPinLabel: string | null;
  destinationPinLabel: string | null;
  defaultDestinationId: string;
  selectTarget: 'origin' | 'destination' | null;
  route: RouteResponse | null;
  isCalculating: boolean;
  error: string | null;
  onPickOnMap: (target: 'origin' | 'destination') => void;
  onStart: (originId: string, destinationId: string) => void;
  onClear: () => void;
  // Live guidance (optional)
  nextInstruction?: string | null;
  remainingMeters?: number | null;
}

export function NavigationPanel({
  places, currentLocation, originPinLabel, destinationPinLabel, defaultDestinationId,
  selectTarget, route, isCalculating, error, onPickOnMap, onStart, onClear,
  nextInstruction, remainingMeters,
}: NavigationPanelProps) {
  const [originId, setOriginId] = useState(currentLocation ? CURRENT_LOCATION : '');
  const [selectedDestinationId, setSelectedDestinationId] = useState(defaultDestinationId || '');

  useEffect(() => {
    if (defaultDestinationId) setSelectedDestinationId(defaultDestinationId);
  }, [defaultDestinationId]);

  // When a start point is dropped on the map, select it automatically.
  useEffect(() => {
    if (originPinLabel) setOriginId(MAP_ORIGIN);
  }, [originPinLabel]);

  // Default the origin to the live location as soon as it becomes available.
  useEffect(() => {
    if (!originId && currentLocation) setOriginId(CURRENT_LOCATION);
  }, [currentLocation, originId]);

  // Listen for place selections coming from the global search overlay
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent;
        const { place, target } = ce.detail || {};
        if (!place) return;
        if (target === 'origin') {
          setOriginId(place.id);
        } else if (target === 'destination') {
          setSelectedDestinationId(place.id);
        } else {
          // Default: set destination when no explicit target
          setSelectedDestinationId(place.id);
        }
      } catch (_) {}
    };
    window.addEventListener('dishaa-place-selected', handler as EventListener);
    return () => window.removeEventListener('dishaa-place-selected', handler as EventListener);
  }, []);

  const routeStatus = error
    || (isCalculating ? 'Finding the best walking route…'
      : route ? 'Route ready. Follow the highlighted walking path.'
        : 'Choose a start and destination, or tap the map to drop a pin.');

  return (
    <BottomSheet className="route-panel-sheet">
      <section className="route-panel" aria-live="polite">
        <div className="route-quick-selection">
          <button type="button" className="quick-card" onClick={() => { const el = document.getElementById('from-place-select') as HTMLSelectElement | null; if (el) el.focus(); }}>
            <div className="quick-label">From</div>
            <div className="quick-value">{originId === CURRENT_LOCATION ? (currentLocation ? '📍 My current location' : 'Use my current location') : originId === MAP_ORIGIN ? (originPinLabel || 'Selected map point') : (places.find(p => p.id === originId)?.name || 'Choose origin')}</div>
          </button>
          <button type="button" className="quick-card" onClick={() => { window.dispatchEvent(new CustomEvent('dishaa-open-search', { detail: { target: 'destination' } })); }}>
            <div className="quick-label">To</div>
            <div className="quick-value">{selectedDestinationId === MAP_DESTINATION ? (destinationPinLabel || 'Selected map point') : (places.find(p => p.id === selectedDestinationId)?.name || 'Choose destination')}</div>
          </button>
        </div>
        <div className="route-panel-heading">
          <div>
            <p className="eyebrow">Walking route</p>
            <h2>{route ? `Route to ${route.to.name}` : 'Plan your route'}</h2>
          </div>
          <button className="quiet-button" type="button" onClick={onClear}>Clear route</button>
        </div>

        <div className="route-selectors">
          {/** Live guidance summary shown when navigation is active */}
          {route && (nextInstruction || typeof remainingMeters === 'number') && (
            <div className="live-guidance">
              {nextInstruction && <div className="live-instruction">{nextInstruction}</div>}
              {typeof remainingMeters === 'number' && <div className="live-remaining">{`${remainingMeters} m remaining`}</div>}
            </div>
          )}
          <div className="route-select-row">
            <label className="route-select-label" htmlFor="from-place-select">
              <span>From</span>
              <select id="from-place-select" value={originId} onChange={(event) => {
                const v = event.target.value;
                if (v === 'search-origin') {
                  window.dispatchEvent(new CustomEvent('dishaa-open-search', { detail: { target: 'origin' } }));
                  return;
                }
                setOriginId(v);
              }}>
                <option value="">Choose your location</option>
                <option value={CURRENT_LOCATION}>{currentLocation ? '📍 My current location' : 'Use my current location'}</option>
                <option value="search-origin">🔎 Select location manually</option>
                {originPinLabel && <option value={MAP_ORIGIN}>{originPinLabel}</option>}
                {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className={`map-pick-button ${selectTarget === 'origin' ? 'is-active' : ''}`}
              onClick={() => onPickOnMap('origin')}
            >
              {selectTarget === 'origin' ? 'Tap map…' : 'Pick on map'}
            </button>
          </div>

          <span className="route-connector" aria-hidden="true">↓</span>

          <div className="route-select-row">
            <label className="route-select-label" htmlFor="to-place-select">
              <span>To</span>
              <select id="to-place-select" value={selectedDestinationId} onChange={(event) => setSelectedDestinationId(event.target.value)}>
                <option value="">🔎 Where do you want to go?</option>
                <option value="search-destination">🔎 Search for a destination</option>
                {destinationPinLabel && <option value={MAP_DESTINATION}>{destinationPinLabel}</option>}
                {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className={`map-pick-button ${selectTarget === 'destination' ? 'is-active' : ''}`}
              onClick={() => onPickOnMap('destination')}
            >
              {selectTarget === 'destination' ? 'Tap map…' : 'Select on map'}
            </button>
          </div>
        </div>

        <button className="primary-button" type="button" disabled={isCalculating} onClick={() => onStart(originId, selectedDestinationId)}>
          {isCalculating ? 'Finding route…' : 'Start navigation'}
        </button>
        <p className={`route-progress ${error ? 'is-error' : ''}`} role="status">{routeStatus}</p>
        {route && <RouteSummary route={route.route} />}
        {route && <NavigationInstructions instructions={route.route.instructions} />}
      </section>
    </BottomSheet>
  );
}

export { CURRENT_LOCATION, MAP_ORIGIN, MAP_DESTINATION };
