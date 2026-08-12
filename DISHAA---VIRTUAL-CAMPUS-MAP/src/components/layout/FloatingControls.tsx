interface FloatingControlsProps {
  onLocate: () => void;
  onReset: () => void;
  onAssistant?: () => void;
}

export function FloatingControls({ onLocate, onReset, onAssistant }: FloatingControlsProps) {
  return (
    <div className="floating-controls" aria-hidden="false">
      <button className="fc-btn" aria-label="Use my current location" onClick={onLocate}>◎</button>
      <button className="fc-btn" aria-label="Reset campus view" onClick={onReset}>⌂</button>
      <button className="fc-btn" aria-label="Assistant" onClick={onAssistant}>✦</button>
    </div>
  );
}

export default FloatingControls;
