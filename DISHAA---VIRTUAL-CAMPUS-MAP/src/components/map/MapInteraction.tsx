import { useEffect, useRef } from 'react';
import { divIcon } from 'leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import type { Coordinates, PinPoint } from '../../types';
import { categoryLabel } from '../../utils/categories';

interface MapInteractionProps {
  originPin: PinPoint | null;
  destinationPin: PinPoint | null;
  routeActive: boolean;
  onMapClick: (coordinates: Coordinates) => void;
  onSetDestination: () => void;
  onNavigate: () => void;
}

const destinationIcon = divIcon({
  className: 'point-icon-wrapper',
  html: '<span class="selection-marker selection-destination"></span>',
  iconSize: [21, 21],
  iconAnchor: [10, 10],
});

const originIcon = divIcon({
  className: 'point-icon-wrapper',
  html: '<span class="selection-marker selection-origin"></span>',
  iconSize: [21, 21],
  iconAnchor: [10, 10],
});

function formatCoordinates({ lat, lng }: Coordinates): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function MapInteraction({
  originPin, destinationPin, routeActive, onMapClick, onSetDestination, onNavigate,
}: MapInteractionProps) {
  const destinationRef = useRef<LeafletMarker | null>(null);

  useMapEvents({
    click: (event) => onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });

  // Open the destination popup automatically whenever a new pin is dropped.
  useEffect(() => {
    if (destinationPin && !routeActive && destinationRef.current) {
      destinationRef.current.openPopup();
    }
  }, [destinationPin, routeActive]);

  return (
    <>
      {originPin && !routeActive && (
        <Marker position={[originPin.coordinates.lat, originPin.coordinates.lng]} icon={originIcon}>
          <Popup>
            <div className="map-pin-popup">
              <p className="eyebrow">Start point</p>
              <strong>{originPin.place ? originPin.place.name : 'Selected location'}</strong>
              <small>{formatCoordinates(originPin.coordinates)}</small>
            </div>
          </Popup>
        </Marker>
      )}

      {destinationPin && !routeActive && (
        <Marker
          position={[destinationPin.coordinates.lat, destinationPin.coordinates.lng]}
          icon={destinationIcon}
          ref={destinationRef}
        >
          <Popup>
            <div className="map-pin-popup">
              <p className="eyebrow">Destination</p>
              <strong>{destinationPin.place ? destinationPin.place.name : 'Selected location'}</strong>
              {destinationPin.place
                ? <span className="map-pin-tag">{categoryLabel(destinationPin.place.category)}</span>
                : <small>{formatCoordinates(destinationPin.coordinates)}</small>}
              <div className="map-pin-actions">
                <button type="button" onClick={onSetDestination}>Set as Destination</button>
                <button type="button" className="is-primary" onClick={onNavigate}>Navigate</button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
