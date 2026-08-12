import { useEffect, useState } from 'react';
import type { Coordinates, Place, RouteResponse } from '../../types';
import { NavigationInstructions } from './NavigationInstructions';
import { RouteSummary } from './RouteSummary';

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
}

export function NavigationPanel({
  places, currentLocation, originPinLabel, destinationPinLabel, defaultDestinationId,
  selectTarget, route, isCalculating, error, onPickOnMap, onStart, onClear,
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

  const routeStatus = error
    || (isCalculating ? 'Finding the best walking route…'
      : route ? 'Route ready. Follow the highlighted walking path.'
        : 'Choose a start and destination, or tap the map to drop a pin.');

  return (
    <section className="route-panel" aria-live="polite">
      <div className="route-panel-heading">
        <div>
          <p className="eyebrow">Walking route</p>
          <h2>{route ? `Route to ${route.to.name}` : 'Plan your route'}</h2>
        </div>
        <button className="quiet-button" type="button" onClick={onClear}>Clear route</button>
      </div>

      <div className="route-selectors">
        <div className="route-select-row">
          <label className="route-select-label" htmlFor="from-place-select">
            <span>From</span>
            <select id="from-place-select" value={originId} onChange={(event) => setOriginId(event.target.value)}>
              <option value="">Choose your location</option>
              <option value={CURRENT_LOCATION}>{currentLocation ? 'My current location' : 'Use my current location'}</option>
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
              <option value="">Choose a destination</option>
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
  );
}

export { CURRENT_LOCATION, MAP_ORIGIN, MAP_DESTINATION };
