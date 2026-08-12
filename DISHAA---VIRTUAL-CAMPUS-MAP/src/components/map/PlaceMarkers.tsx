import { divIcon } from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import type { Place } from '../../types';
import { categoryGlyph } from '../../utils/categories';

interface PlaceMarkersProps {
  places: Place[];
  onSelect: (place: Place) => void;
}

const knownCategories = new Set(['academic', 'building', 'food', 'hostel', 'sports', 'parking', 'office', 'facility', 'gate']);

function createMarkerIcon(category: string) {
  const markerCategory = knownCategories.has(category) ? category : 'other';
  return divIcon({
    className: 'marker-icon-wrapper',
    html: `<span class="dishaa-marker marker-${markerCategory}"><span>${categoryGlyph(category)}</span></span>`,
    iconSize: [29, 29],
    iconAnchor: [14, 26],
  });
}

export function PlaceMarkers({ places, onSelect }: PlaceMarkersProps) {
  return (
    <>
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.location.lat, place.location.lng]}
          icon={createMarkerIcon(place.category)}
          eventHandlers={{ click: () => onSelect(place) }}
        >
          <Tooltip direction="top" offset={[0, -23]} opacity={0.92}>{place.name}</Tooltip>
        </Marker>
      ))}
    </>
  );
}
