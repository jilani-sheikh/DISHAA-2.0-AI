import type { Place } from '../../types';
import { categoryLabel, formatSubtype } from '../../utils/categories';
import { BottomSheet } from '../ui/BottomSheet';

interface PlaceDetailsProps {
  place: Place;
  onClose: () => void;
  onNavigate: () => void;
}

export function PlaceDetails({ place, onClose, onNavigate }: PlaceDetailsProps) {
  const subtype = formatSubtype(place.subcategory);

  const hasLocation = !!(place && place.location && typeof place.location.lat === 'number' && typeof place.location.lng === 'number');

  // If this is the special current-location token or the place lacks location
  // coordinates, render a safe fallback UI rather than attempting to access
  // `place.location.lat` which causes a runtime crash.
  if (!hasLocation || place.id === 'current-location') {
    return (
      <BottomSheet className="place-details-sheet">
        <section className="place-card" aria-live="polite">
          <button className="close-panel-button" type="button" aria-label="Close place details" onClick={onClose}>×</button>
          <p className="eyebrow">{place.id === 'current-location' ? 'Current location' : categoryLabel(place.category)}{subtype ? ` · ${subtype}` : ''}</p>
          <h1>{place.name || (place.id === 'current-location' ? '📍 My current location' : 'Unknown place')}</h1>
          <p>{place.description || (place.id === 'current-location' ? 'Using your device GPS as the start point.' : 'A campus location in the DISHAA directory.')}</p>
          <div className="place-meta">
            <div>
              <dt>Location</dt>
              <dd>{place.id === 'current-location' ? 'Using device GPS' : 'Location not available'}</dd>
            </div>
          </div>
          <button className="primary-button" type="button" onClick={onNavigate}>Navigate here</button>
        </section>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet className="place-details-sheet">
      <section className="place-card" aria-live="polite">
        <button className="close-panel-button" type="button" aria-label="Close place details" onClick={onClose}>×</button>
        <p className="eyebrow">{categoryLabel(place.category)}{subtype ? ` · ${subtype}` : ''}</p>
        <h1>{place.name}</h1>
        <p>{place.description || 'A campus location in the DISHAA directory.'}</p>
        <dl className="place-meta">
          <div>
            <dt>Location</dt>
            <dd>{place.location.lat.toFixed(5)}, {place.location.lng.toFixed(5)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{subtype || categoryLabel(place.category)}</dd>
          </div>
        </dl>
        <button className="primary-button" type="button" onClick={onNavigate}>Navigate here</button>
      </section>
    </BottomSheet>
  );
}
