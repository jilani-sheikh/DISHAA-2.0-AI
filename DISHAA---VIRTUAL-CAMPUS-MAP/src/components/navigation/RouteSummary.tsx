import type { CampusRoute } from '../../types';

interface RouteSummaryProps {
  route: CampusRoute;
  fromName?: string;
  toName?: string;
}

export function RouteSummary({ route, fromName, toName }: RouteSummaryProps) {
  const distanceFormatted = route.distanceKm < 1
    ? `${Math.round(route.distanceKm * 1000)} m`
    : `${route.distanceKm.toFixed(2)} km`;

  return (
    <div className="clean-route-summary">
      {fromName && toName && (
        <div className="route-path-header">
          <div className="path-node origin-node">
            <span className="node-dot origin-dot">●</span>
            <span className="node-name">{fromName}</span>
          </div>
          <div className="path-arrow">↓</div>
          <div className="path-node dest-node">
            <span className="node-dot dest-dot">📍</span>
            <span className="node-name">{toName}</span>
          </div>
        </div>
      )}
      <div className="route-stats-row">
        <div className="stat-card">
          <span className="stat-label">Distance</span>
          <strong className="stat-value">{distanceFormatted}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Est. Time</span>
          <strong className="stat-value">{Math.max(1, Math.round(route.durationMin))} min walk</strong>
        </div>
        {route.instructions && (
          <div className="stat-card">
            <span className="stat-label">Steps</span>
            <strong className="stat-value">{route.instructions.length} maneuvers</strong>
          </div>
        )}
      </div>
    </div>
  );
}
