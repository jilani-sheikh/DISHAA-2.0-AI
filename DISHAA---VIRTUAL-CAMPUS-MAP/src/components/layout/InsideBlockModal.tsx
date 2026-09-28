import React, { useState, useEffect } from 'react';
import { Building, Layers, X, Compass, ArrowLeft, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';

interface InsideBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
  initialBlock?: 'BLOCK A' | 'BLOCK B' | 'BLOCK C';
  initialFloor?: number;
}

export function InsideBlockModal({
  isOpen,
  onClose,
  isInline = false,
  initialBlock = 'BLOCK B',
  initialFloor = 1,
}: InsideBlockModalProps) {
  const [selectedBlock, setSelectedBlock] = useState<'BLOCK A' | 'BLOCK B' | 'BLOCK C'>(initialBlock);
  const [selectedFloor, setSelectedFloor] = useState<number>(initialFloor);
  const [showFullscreenViewer, setShowFullscreenViewer] = useState<boolean>(false);

  useEffect(() => {
    if (initialBlock) setSelectedBlock(initialBlock);
    if (initialFloor !== undefined) setSelectedFloor(initialFloor);
  }, [initialBlock, initialFloor]);

  const blocks = ['BLOCK A', 'BLOCK B', 'BLOCK C'] as const;

  const blockFloorsConfig: Record<string, { value: number; label: string }[]> = {
    'BLOCK A': [{ value: 0, label: '0 (Ground Floor)' }],
    'BLOCK B': [
      { value: 1, label: '1 (1st Floor)' },
      { value: 2, label: '2 (2nd Floor)' },
      { value: 3, label: '3 (3rd Floor)' },
      { value: 4, label: '4 (4th Floor)' },
    ],
    'BLOCK C': [{ value: 0, label: '0 (Ground Floor)' }],
  };

  const availableFloors = blockFloorsConfig[selectedBlock] || [];

  const checkIsFloorReady = (block: string, floorNum: number): boolean => {
    if (block === 'BLOCK A') return floorNum === 0;
    if (block === 'BLOCK B') return [1, 2, 3, 4].includes(floorNum);
    if (block === 'BLOCK C') return floorNum === 0;
    return false;
  };

  const isFloorReady = checkIsFloorReady(selectedBlock, selectedFloor);
  const blockCode = selectedBlock.replace('BLOCK ', '');
  const indoorViewerUrl = `/indoor-viewer/index.html?block=${blockCode}&floor=${selectedFloor}`;

  const handleSelectBlock = (block: 'BLOCK A' | 'BLOCK B' | 'BLOCK C') => {
    setSelectedBlock(block);
    let defaultFloor = 0;
    if (block === 'BLOCK B') defaultFloor = 1;
    setSelectedFloor(defaultFloor);
  };

  const handleSelectFloor = (floorNum: number) => {
    setSelectedFloor(floorNum);
    if (checkIsFloorReady(selectedBlock, floorNum)) {
      setShowFullscreenViewer(true);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── 1. SELECTOR PANEL (Inside Block feature panel) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Inside Block Navigation
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                3D & 2D interactive spatial floor maps
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STEP 1: Select Building Block */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
              1. Select Building Block
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {blocks.map((block) => {
                const isSelected = selectedBlock === block;
                return (
                  <button
                    key={block}
                    type="button"
                    onClick={() => handleSelectBlock(block)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#1e293b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Building size={14} />
                    <span>{block}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Select Floor */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
              2. Select Floor for {selectedBlock}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {availableFloors.map((fl) => {
                const isSelected = selectedFloor === fl.value;
                return (
                  <button
                    key={fl.value}
                    type="button"
                    onClick={() => handleSelectFloor(fl.value)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#2563eb' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <span>{fl.value === 0 ? 'Ground' : `Floor ${fl.value}`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Launch Fullscreen */}
          {isFloorReady ? (
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '14px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 800, fontSize: '13px' }}>
                <Sparkles size={16} />
                <span>3D Spatial Map Ready</span>
              </div>
              <p style={{ margin: '6px 0 12px 0', fontSize: '11px', color: '#065f46' }}>
                Classrooms, faculty cabins, labs, and interactive 3D floor geometry ready for {selectedBlock}.
              </p>
              <button
                type="button"
                onClick={() => setShowFullscreenViewer(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                }}
              >
                <Compass size={16} />
                <span>Launch Interactive 3D Viewer</span>
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 800, fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>Floor Under Construction</span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#92400e' }}>
                The 3D model for this specific floor is undergoing CAD optimization.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. FULLSCREEN 3D VIEWER MODAL ── */}
      {showFullscreenViewer && isFloorReady && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              height: '48px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowFullscreenViewer(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                {selectedBlock} &bull; {selectedFloor === 0 ? 'Ground Floor' : `Floor ${selectedFloor}`}
              </strong>
            </div>

            <button
              onClick={() => setShowFullscreenViewer(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, width: '100%', height: '100%' }}>
            <iframe
              src={indoorViewerUrl}
              title={`Indoor Map ${selectedBlock} Floor ${selectedFloor}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            />
          </div>
        </div>
      )}
    </>
  );
}
