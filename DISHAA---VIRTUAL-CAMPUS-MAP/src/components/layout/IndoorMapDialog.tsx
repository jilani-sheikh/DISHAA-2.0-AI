import { useState } from 'react';

interface IndoorMapDialogProps {
  onClose: () => void;
}

const indoorMaps = [
  { value: 'maps/block-b_1.html', label: 'Block B · First floor' },
  { value: 'maps/block-b_4.html', label: 'Block B · Fourth floor' },
];

export function IndoorMapDialog({ onClose }: IndoorMapDialogProps) {
  const [mapPath, setMapPath] = useState(indoorMaps[0].value);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="indoor-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="indoor-map-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close indoor maps">×</button>
        <p className="eyebrow">Existing indoor guide</p>
        <h2 id="indoor-map-title">Explore Block B</h2>
        <p>Choose an available floor plan to continue with the existing indoor experience.</p>
        <label htmlFor="indoor-map-select">Floor plan</label>
        <select id="indoor-map-select" value={mapPath} onChange={(event) => setMapPath(event.target.value)}>
          {indoorMaps.map((indoorMap) => <option key={indoorMap.value} value={indoorMap.value}>{indoorMap.label}</option>)}
        </select>
        <button className="primary-button" type="button" onClick={() => window.location.assign(mapPath)}>Open indoor map</button>
      </section>
    </div>
  );
}
