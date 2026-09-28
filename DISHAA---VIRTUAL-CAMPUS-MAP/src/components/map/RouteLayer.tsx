import L, { divIcon } from 'leaflet';
import { Marker, Polyline, Popup } from 'react-leaflet';
import type { Coordinates, RouteResponse } from '../../types';
import type { RouteOption, StepMilestone } from '../../lib/campusData';

interface RouteLayerProps {
  route: RouteResponse | null;
  coordinates: Coordinates[];
  routes?: RouteOption[];
  activeRouteIndex?: number;
  milestones?: StepMilestone[];
  currentStepIndex?: number;
}

const createDirectionIcon = (color: string, label: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
      <defs>
        <filter id="dglow-${label}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${color}" flood-opacity="0.9"/>
        </filter>
      </defs>
      <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 32 20 32s20-17 20-32C40 8.954 31.046 0 20 0z" fill="${color}" filter="url(#dglow-${label})"/>
      <circle cx="20" cy="18" r="9" fill="#0f172a"/>
      <circle cx="20" cy="18" r="5" fill="#ffffff"/>
      <circle cx="20" cy="18" r="2.5" fill="${color}"/>
    </svg>
  `;
  return divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -48],
  });
};

const createHumanAvatarIcon = (stepNum: number) => {
  const svg = `
    <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:40px; height:40px; border-radius:50%; background:rgba(56,189,248,0.35); border:2px solid #38bdf8;"></div>
      <div style="position:relative; width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #0284c7, #2563eb); border:2px solid #ffffff; box-shadow:0 0 16px rgba(56,189,248,0.9); display:flex; align-items:center; justify-content:center; font-size:16px;">
        🚶
      </div>
      <div style="position:absolute; top:-18px; background:#0f172a; border:1px solid #38bdf8; color:#38bdf8; font-size:8px; font-weight:800; font-family:monospace; padding:1px 4px; border-radius:6px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.5);">
        STEP ${stepNum}
      </div>
    </div>
  `;
  return divIcon({
    className: 'custom-human-avatar-marker',
    html: svg,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createMilestoneIcon = (stepNum: number) => {
  const html = `
    <div style="width:20px; height:20px; border-radius:50%; background:#ffffff; border:2.5px solid #2563eb; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; color:#2563eb; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
      ${stepNum}
    </div>
  `;
  return divIcon({
    className: 'milestone-point-icon',
    html,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const fromIcon = createDirectionIcon('#22c55e', 'from');
const toIcon = createDirectionIcon('#ef4444', 'to');

export function RouteLayer({
  route,
  coordinates,
  routes = [],
  activeRouteIndex = 0,
  milestones = [],
  currentStepIndex = 0,
}: RouteLayerProps) {
  // If no multi-routes and no basic route, nothing to render
  if (!route && routes.length === 0 && coordinates.length === 0) return null;

  // 1. If we have multi-routes calculated from client-side A*
  if (routes.length > 0) {
    const activeRoute = routes[activeRouteIndex] || routes[0];
    const fromCoord = activeRoute.path[0];
    const toCoord = activeRoute.path[activeRoute.path.length - 1];

    // Current active avatar step
    const currentMilestone = milestones[currentStepIndex] || milestones[0];

    return (
      <>
        {/* Render inactive routes first (below active) */}
        {routes.map((rt, idx) => {
          if (idx === activeRouteIndex) return null;
          return (
            <Polyline
              key={rt.id}
              positions={rt.path}
              pathOptions={{
                color: rt.color,
                weight: 5,
                opacity: 0.5,
                dashArray: '6, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          );
        })}

        {/* Render active route line (bold & glowing) */}
        <Polyline
          positions={activeRoute.path}
          pathOptions={{
            color: activeRoute.color,
            weight: 7,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />

        {/* Start and Destination Markers */}
        {fromCoord && <Marker position={fromCoord} icon={fromIcon} interactive={false} />}
        {toCoord && <Marker position={toCoord} icon={toIcon} interactive={false} />}

        {/* Intermediate milestone markers */}
        {milestones.map((ms, i) => {
          if (i === 0 || i === milestones.length - 1) return null; // skip start/end
          return (
            <Marker key={i} position={ms.coords} icon={createMilestoneIcon(ms.stepNumber)}>
              <Popup>
                <div style={{ padding: '4px', maxWidth: '200px' }}>
                  <strong style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>{ms.title}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{ms.instruction}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Current Active Human Walking Avatar */}
        {currentMilestone && (
          <Marker
            position={currentMilestone.coords}
            icon={createHumanAvatarIcon(currentMilestone.stepNumber)}
            zIndexOffset={1000}
          />
        )}
      </>
    );
  }

  // 2. Fallback to basic route from backend / Valhalla
  return (
    <>
      {coordinates.length > 1 && (
        <Polyline
          positions={coordinates.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
      {route && (
        <>
          <Marker position={[route.from.lat, route.from.lng]} icon={fromIcon} interactive={false} />
          <Marker position={[route.to.lat, route.to.lng]} icon={toIcon} interactive={false} />
        </>
      )}
    </>
  );
}
