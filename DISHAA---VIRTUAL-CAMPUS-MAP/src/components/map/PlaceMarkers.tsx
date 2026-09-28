import React from 'react';
import { divIcon } from 'leaflet';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import type { Place } from '../../types';
import { Building, Navigation, Layers, Compass, ArrowRight } from 'lucide-react';

interface PlaceMarkersProps {
  places: Place[];
  onSelect: (place: Place) => void;
  onNavigateToPlace?: (place: Place) => void;
  onOpenIndoorViewer?: (block: string, floor: number) => void;
  categoryFilter?: string; // Default 'academic'
}

const createAcademicIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 44" width="34" height="44">
      <defs>
        <filter id="glow-academic" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#2563eb" flood-opacity="0.8"/>
        </filter>
      </defs>
      <path d="M17 0C7.611 0 0 7.611 0 17c0 12.75 17 27 17 27s17-14.25 17-27C34 7.611 26.389 0 17 0z" fill="#2563eb" filter="url(#glow-academic)"/>
      <circle cx="17" cy="15" r="7.5" fill="#ffffff"/>
      <path d="M13 15.5l4-3.5 4 3.5v3h-2.5v-2h-3v2H13v-3z" fill="#2563eb"/>
    </svg>
  `;
  return divIcon({
    className: 'custom-academic-marker',
    html: svg,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -42],
  });
};

const createOtherIcon = (category: string) => {
  return divIcon({
    className: 'marker-icon-wrapper',
    html: `<span class="dishaa-marker marker-${category}"><span>•</span></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 22],
  });
};

export function PlaceMarkers({
  places,
  onSelect,
  onNavigateToPlace,
  onOpenIndoorViewer,
  categoryFilter = 'academic',
}: PlaceMarkersProps) {
  // Filter places based on categoryFilter (defaults to 'academic' only)
  const visiblePlaces = places.filter((place) => {
    if (!categoryFilter || categoryFilter === 'all') return true;
    return place.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  const getBlockDetails = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('block a')) {
      return {
        blockCode: 'BLOCK A',
        floor: 0,
        departments: 'Student Section, Account Counter & First Year Engg',
        image: '/temple.jpeg',
      };
    }
    if (lower.includes('block b')) {
      return {
        blockCode: 'BLOCK B',
        floor: 1,
        departments: 'Central Canteen, Gymnasium, Sports Room & Library',
        image: '/temple.jpeg',
      };
    }
    if (lower.includes('block c')) {
      return {
        blockCode: 'BLOCK C',
        floor: 0,
        departments: 'Computer Science, AI, Data Science & Cybersecurity',
        image: '/temple.jpeg',
      };
    }
    return {
      blockCode: null,
      floor: 0,
      departments: 'Academic Laboratories & Classrooms',
      image: '/temple.jpeg',
    };
  };

  return (
    <>
      {visiblePlaces.map((place) => {
        const isAcademic = place.category.toLowerCase() === 'academic';
        const blockInfo = getBlockDetails(place.name);

        return (
          <Marker
            key={place.id}
            position={[place.location.lat, place.location.lng]}
            icon={isAcademic ? createAcademicIcon() : createOtherIcon(place.category)}
            eventHandlers={{
              click: () => onSelect(place),
            }}
          >
            <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
              <span style={{ fontWeight: 700, fontSize: '12px' }}>{place.name}</span>
            </Tooltip>

            {/* ONLY SHOW POPUP FOR ACADEMIC PLACES */}
            {isAcademic && (
              <Popup className="academic-leaflet-popup" autoPan={true}>
                <div
                  style={{
                    padding: '4px',
                    maxWidth: '240px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Academic Block
                    </span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                      Active
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {place.name}
                  </h4>

                  <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    {blockInfo.departments}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Navigate Button */}
                    {onNavigateToPlace && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPlace(place)}
                        style={{
                          width: '100%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                        }}
                      >
                        <Navigation size={13} />
                        <span>Navigate to {place.name}</span>
                      </button>
                    )}

                    {/* 3D Indoor Viewer Button (for Blocks A, B, C) */}
                    {blockInfo.blockCode && onOpenIndoorViewer && (
                      <button
                        type="button"
                        onClick={() => onOpenIndoorViewer(blockInfo.blockCode!, blockInfo.floor)}
                        style={{
                          width: '100%',
                          backgroundColor: '#f8fafc',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Layers size={13} color="#2563eb" />
                        <span>Enter 3D Indoor Floor View</span>
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
}
