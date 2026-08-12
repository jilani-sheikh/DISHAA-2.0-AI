import type { Place } from '../../types';

interface NearbyPlacesProps {
  places: Place[];
  onSelect: (place: Place) => void;
}

export function NearbyPlaces({ places, onSelect }: NearbyPlacesProps) {
  if (!places.length) return null;

  return (
    <section className="nearby-card" aria-label="Places near your location">
      <p className="eyebrow">Near your location</p>
      <p className="nearby-summary">{places.length} campus places within a short walk.</p>
      <div className="nearby-list">
        {places.slice(0, 3).map((place) => (
          <button key={place.id} type="button" onClick={() => onSelect(place)}>{place.name}<span>›</span></button>
        ))}
      </div>
    </section>
  );
}
