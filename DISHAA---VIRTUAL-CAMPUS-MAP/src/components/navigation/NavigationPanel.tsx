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
  // Voice Navigation
  isVoiceEnabled?: boolean;
  isSpeaking?: boolean;
  onToggleVoice?: () => void;
}

export function NavigationPanel({
  places, currentLocation, originPinLabel, destinationPinLabel, defaultDestinationId,
  selectTarget, route, isCalculating, error, onPickOnMap, onStart, onClear,
  nextInstruction, remainingMeters,
  isVoiceEnabled = true, isSpeaking = false, onToggleVoice,
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
            <p className="eyebrow">Campus Navigation</p>
            <h2>{route ? `Route to ${route.to.name}` : 'Select Start & End Locations'}</h2>
          </div>
          <button className="quiet-button" type="button" onClick={onClear}>Clear route</button>
        </div>

        <div className="route-selectors-container">
          {/** Live guidance summary shown when navigation is active */}
          {route && (nextInstruction || typeof remainingMeters === 'number') && (
            <div className="live-guidance">
              <div className="live-guidance-header">
                <span className="live-guidance-badge">🚶 Live Turn-by-Turn</span>
                {onToggleVoice && (
                  <button
                    type="button"
                    className={`voice-nav-toggle ${isSpeaking ? 'is-speaking' : isVoiceEnabled ? 'is-enabled' : 'is-muted'}`}
                    onClick={onToggleVoice}
                    title={isVoiceEnabled ? 'Voice Guidance Active (Click to Mute)' : 'Voice Guidance Muted (Click to Enable)'}
                  >
                    {isSpeaking ? '🔊 Speaking…' : isVoiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                  </button>
                )}
              </div>
              {nextInstruction && <div className="live-instruction">{nextInstruction}</div>}
              {typeof remainingMeters === 'number' && <div className="live-remaining">{`${remainingMeters} m remaining`}</div>}
            </div>
          )}

          {/* Start Location Dropdown Box */}
          <div className="route-select-card start-card">
            <div className="card-header">
              <span className="card-dot origin-dot">🟢</span>
              <span className="card-title">Start Location (From)</span>
            </div>
            <div className="card-controls">
              <select
                id="from-place-select"
                className="dropdown-select"
                value={originId}
                onChange={(event) => {
                  const v = event.target.value;
                  if (v === 'search-origin') {
                    window.dispatchEvent(new CustomEvent('dishaa-open-search', { detail: { target: 'origin' } }));
                    return;
                  }
                  setOriginId(v);
                }}
              >
                <option value="">-- Select Start Location --</option>
                <option value={CURRENT_LOCATION}>{currentLocation ? '📍 My Current Location (GPS)' : '📍 Use My Current Location'}</option>
                <option value="search-origin">🔎 Search location by name...</option>
                {originPinLabel && <option value={MAP_ORIGIN}>📌 {originPinLabel}</option>}
                <optgroup label="Campus Places">
                  {[...places].sort((a, b) => a.name.localeCompare(b.name)).map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name} ({place.category})
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                className={`map-pick-button ${selectTarget === 'origin' ? 'is-active' : ''}`}
                onClick={() => onPickOnMap('origin')}
                title="Tap a point on the map to set as start location"
              >
                {selectTarget === 'origin' ? 'Tap map…' : '📍 Map Pin'}
              </button>
            </div>
          </div>

          {/* Swap Button Divider */}
          <div className="route-swap-row">
            <div className="swap-line" />
            <button
              type="button"
              className="route-swap-banner"
              title="Swap Start & Destination Locations"
              onClick={() => {
                const temp = originId;
                setOriginId(selectedDestinationId);
                setSelectedDestinationId(temp);
              }}
            >
              ⇄ Swap Start & End
            </button>
            <div className="swap-line" />
          </div>

          {/* End Location Dropdown Box */}
          <div className="route-select-card destination-card">
            <div className="card-header">
              <span className="card-dot dest-dot">🔴</span>
              <span className="card-title">End Location (Destination)</span>
            </div>
            <div className="card-controls">
              <select
                id="to-place-select"
                className="dropdown-select"
                value={selectedDestinationId}
                onChange={(event) => {
                  const v = event.target.value;
                  if (v === 'search-destination') {
                    window.dispatchEvent(new CustomEvent('dishaa-open-search', { detail: { target: 'destination' } }));
                    return;
                  }
                  setSelectedDestinationId(v);
                }}
              >
                <option value="">-- Select End Location --</option>
                <option value="search-destination">🔎 Search destination by name...</option>
                {destinationPinLabel && <option value={MAP_DESTINATION}>📌 {destinationPinLabel}</option>}
                <optgroup label="Campus Places">
                  {[...places].sort((a, b) => a.name.localeCompare(b.name)).map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name} ({place.category})
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                className={`map-pick-button ${selectTarget === 'destination' ? 'is-active' : ''}`}
                onClick={() => onPickOnMap('destination')}
                title="Tap a point on the map to set as end location"
              >
                {selectTarget === 'destination' ? 'Tap map…' : '📍 Map Pin'}
              </button>
            </div>
          </div>
        </div>

        <button
          className="primary-button nav-start-btn"
          type="button"
          disabled={isCalculating || !originId || !selectedDestinationId}
          onClick={() => onStart(originId, selectedDestinationId)}
        >
          {isCalculating ? 'Finding Walking Route…' : '🚀 Get Directions'}
        </button>
        <p className={`route-progress ${error ? 'is-error' : ''}`} role="status">{routeStatus}</p>
        {route && (
          <RouteSummary
            route={route.route}
            fromName={
              originId === CURRENT_LOCATION
                ? (currentLocation ? '📍 My Current Location' : 'Current Location')
                : originId === MAP_ORIGIN
                  ? (originPinLabel || 'Selected map point')
                  : (places.find(p => p.id === originId)?.name || (route as any).from?.name || 'Start Location')
            }
            toName={
              selectedDestinationId === MAP_DESTINATION
                ? (destinationPinLabel || 'Selected map point')
                : (places.find(p => p.id === selectedDestinationId)?.name || route.to?.name || 'Destination')
            }
          />
        )}
        {route && <NavigationInstructions instructions={route.route.instructions} />}
      </section>
    </BottomSheet>
  );
}

export { CURRENT_LOCATION, MAP_ORIGIN, MAP_DESTINATION };
