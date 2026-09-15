import { useState, useEffect } from 'react';
import './indoor-map.css';

export interface IndoorMapDialogProps {
  onClose: () => void;
  initialBlock?: 'BLOCK A' | 'BLOCK B' | 'BLOCK C';
  initialFloor?: number;
  initialRoom?: string;
  autoLaunchFullscreen?: boolean;
}

export function IndoorMapDialog({
  onClose,
  initialBlock = 'BLOCK B',
  initialFloor = 1,
  initialRoom,
  autoLaunchFullscreen = false,
}: IndoorMapDialogProps) {
  const [selectedBlock, setSelectedBlock] = useState<'BLOCK A' | 'BLOCK B' | 'BLOCK C'>(initialBlock);
  const [selectedFloor, setSelectedFloor] = useState<number>(initialFloor);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(autoLaunchFullscreen);

  useEffect(() => {
    if (initialBlock) setSelectedBlock(initialBlock);
    if (initialFloor !== undefined) setSelectedFloor(initialFloor);
    if (autoLaunchFullscreen) setIsFullscreen(true);
  }, [initialBlock, initialFloor, autoLaunchFullscreen]);

  const blockFloorsConfig: Record<string, { value: number; label: string; name: string }[]> = {
    'BLOCK A': [{ value: 0, label: '0F', name: 'Ground Floor' }],
    'BLOCK B': [
      { value: 1, label: '1F', name: '1st Floor' },
      { value: 2, label: '2F', name: '2nd Floor' },
      { value: 3, label: '3F', name: '3rd Floor' },
      { value: 4, label: '4F', name: '4th Floor' },
    ],
    'BLOCK C': [{ value: 0, label: '0F', name: 'Ground Floor' }],
  };

  const handleSelectBlock = (block: 'BLOCK A' | 'BLOCK B' | 'BLOCK C') => {
    setSelectedBlock(block);
    let defaultFloor = 0;
    if (block === 'BLOCK B') defaultFloor = 1;
    setSelectedFloor(defaultFloor);
  };

  const blockCode = selectedBlock.replace('BLOCK ', '').trim();
  let indoorUrl = `/indoor-viewer/index.html?block=${encodeURIComponent(blockCode)}&floor=${selectedFloor}`;
  if (initialRoom) {
    indoorUrl += `&room=${encodeURIComponent(initialRoom)}`;
  }

  const currentFloors = blockFloorsConfig[selectedBlock] || [];

  return (
    <>
      {/* ── 1. Block and Floor Selection Dialog ────────────────── */}
      {!isFullscreen && (
        <div className="indoor-modal-backdrop" role="presentation" onClick={onClose}>
          <div
            className="indoor-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="indoor-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="indoor-modal-header">
              <div className="indoor-header-left">
                <div className="indoor-header-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01" />
                    <path d="M16 6h.01" />
                    <path d="M12 6h.01" />
                    <path d="M12 10h.01" />
                    <path d="M12 14h.01" />
                  </svg>
                </div>
                <div>
                  <h3 id="indoor-modal-title" className="indoor-header-title">Inside Campus Navigation</h3>
                  <p className="indoor-header-desc">Unified 3D & 2D spatial maps for Block A, B, and C</p>
                </div>
              </div>
              <button
                type="button"
                className="indoor-close-btn"
                onClick={onClose}
                aria-label="Close dialog"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="indoor-modal-body">
              {/* Block Selection */}
              <div>
                <div className="indoor-section-label">
                  <span>1. Select Building Block</span>
                  <span className="indoor-pill-badge">Active Spatial Models</span>
                </div>
                <div className="indoor-blocks-grid">
                  {(['BLOCK A', 'BLOCK B', 'BLOCK C'] as const).map((block) => (
                    <button
                      key={block}
                      type="button"
                      className={`indoor-block-btn ${selectedBlock === block ? 'active' : ''}`}
                      onClick={() => handleSelectBlock(block)}
                    >
                      <span>{block}</span>
                      <span className="indoor-block-sub">
                        {block === 'BLOCK A' ? 'Ground Floor (47 rms)' : block === 'BLOCK B' ? '1F to 4F (Labs & Depts)' : 'Ground Floor (21 rms)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Floor Selection */}
              <div>
                <div className="indoor-section-label">
                  <span>2. Select Floor for {selectedBlock}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                    {currentFloors.length} floor{currentFloors.length > 1 ? 's' : ''} available
                  </span>
                </div>
                <div className="indoor-floors-grid">
                  {currentFloors.map((fl) => (
                    <button
                      key={fl.value}
                      type="button"
                      className={`indoor-floor-btn ${selectedFloor === fl.value ? 'active' : ''}`}
                      onClick={() => setSelectedFloor(fl.value)}
                    >
                      <span className="indoor-floor-num">{fl.label}</span>
                      <span className="indoor-floor-name">{fl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status and Action Card */}
              <div className="indoor-status-card">
                <div className="indoor-status-header">
                  <div className="indoor-status-title">
                    <span>✦</span>
                    <span>3D & 2D Spatial Map Ready</span>
                  </div>
                  <span className="indoor-status-chip">
                    {selectedBlock} • {selectedFloor === 0 ? 'Ground' : `Floor ${selectedFloor}`}
                  </span>
                </div>
                <p className="indoor-status-desc">
                  Interactive indoor route planning, turn-by-turn walking steps, classroom/lab search, and 3D architectural views.
                </p>
                <button
                  type="button"
                  className="indoor-primary-action"
                  onClick={() => setIsFullscreen(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                  <span>Launch Fullscreen Indoor Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Fullscreen Interactive 3D/2D Spatial Viewer ─────── */}
      {isFullscreen && (
        <div className="indoor-fullscreen-viewer" role="dialog" aria-modal="true">
          <header className="indoor-fs-navbar">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                type="button"
                className="indoor-fs-back-btn"
                onClick={() => setIsFullscreen(false)}
                title="Return to block and floor selector"
              >
                <span>←</span>
                <span>Select Block & Floor</span>
              </button>
              <span className="indoor-fs-badge">
                {selectedBlock} &bull; {selectedFloor === 0 ? 'Ground Floor (0F)' : `Floor ${selectedFloor} (${selectedFloor}F)`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a
                href={indoorUrl}
                target="_blank"
                rel="noreferrer"
                className="indoor-fs-back-btn"
                title="Open in a new browser tab"
              >
                <span>↗ Open New Tab</span>
              </a>
              <button
                type="button"
                className="indoor-close-btn"
                onClick={onClose}
                aria-label="Close indoor map"
                title="Close"
              >
                ✕
              </button>
            </div>
          </header>

          <iframe
            key={`${selectedBlock}-${selectedFloor}`}
            src={indoorUrl}
            title={`Indoor Map ${selectedBlock} Floor ${selectedFloor}`}
            className="indoor-fs-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          />
        </div>
      )}
    </>
  );
}

export default IndoorMapDialog;
