import type { Place } from '../../types';
import { categoryLabel, formatSubtype } from '../../utils/categories';

interface PlaceDetailsProps {
  place: Place;
  onClose: () => void;
  onNavigate: () => void;
}

export function PlaceDetails({ place, onClose, onNavigate }: PlaceDetailsProps) {
  const subtype = formatSubtype(place.subcategory);

  return (
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
  );
}
