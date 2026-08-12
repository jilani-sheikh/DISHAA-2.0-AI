import type { CampusRoute } from '../../types';

export function RouteSummary({ route }: { route: CampusRoute }) {
  return (
    <div className="route-summary">
      <div><span>Distance</span><strong>{route.distanceKm.toFixed(2)} km</strong></div>
      <div><span>Walking time</span><strong>{route.durationMin.toFixed(1)} min</strong></div>
    </div>
  );
}
