import { useEffect, useState } from 'react';
import type { Coordinates, Place, RouteResponse } from '../../types';
import { NavigationInstructions } from './NavigationInstructions';
import { RouteSummary } from './RouteSummary';

const CURRENT_LOCATION = 'current-location';

interface NavigationPanelProps {
  places: Place[];
  destinationId?: string;
  currentLocation: Coordinates | null;
  route: RouteResponse | null;
  isCalculating: boolean;
  error: string | null;
  onStart: (originId: string, destinationId: string) => void;
  onClear: () => void;
}

export function NavigationPanel({
  places, destinationId, currentLocation, route, isCalculating, error, onStart, onClear,
}: NavigationPanelProps) {
  const [originId, setOriginId] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState(destinationId || '');

  useEffect(() => {
    if (destinationId) setSelectedDestinationId(destinationId);
  }, [destinationId]);

  const routeStatus = error || (isCalculating ? 'Finding the best walking route…' : route ? 'Route ready. Follow the highlighted walking path.' : 'Choose where you are starting from.');

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
        <label className="route-select-label" htmlFor="from-place-select">
          <span>From</span>
          <select id="from-place-select" value={originId} onChange={(event) => setOriginId(event.target.value)}>
            <option value="">Choose your location</option>
            <option value={CURRENT_LOCATION}>{currentLocation ? 'My current location' : 'Use my current location'}</option>
            {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
        <span className="route-connector" aria-hidden="true">↓</span>
        <label className="route-select-label" htmlFor="to-place-select">
          <span>To</span>
          <select id="to-place-select" value={selectedDestinationId} onChange={(event) => setSelectedDestinationId(event.target.value)}>
            <option value="">Choose a destination</option>
            {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
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

export { CURRENT_LOCATION };
