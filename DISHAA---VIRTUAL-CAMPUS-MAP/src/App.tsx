import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CampusMap } from './components/map/CampusMap';
import { BottomNavbar } from './components/navigation/BottomNavbar';
import { BroadcastBanner } from './components/broadcast/BroadcastBanner';
import { UnifiedRouteAndAiPanel } from './components/navigation/UnifiedRouteAndAiPanel';
import { InsideBlockModal } from './components/layout/InsideBlockModal';
import { FacultyFinderPanel } from './components/faculty/FacultyFinderPanel';
import { EventsModal } from './components/events/EventsModal';
import { AdminPortalModal } from './components/admin/AdminPortalModal';
import { Toast } from './components/layout/Toast';
import { useGeolocation } from './hooks/useGeolocation';
import { useHealth } from './hooks/useHealth';
import { usePlaces } from './hooks/usePlaces';
import { useVoiceNavigation } from './hooks/useVoiceNavigation';
import { useLiveGuidance } from './hooks/useLiveGuidance';
import { campusLocations, DirectionsState, CampusLocation } from './lib/campusData';
import { encodePolyline, decodePolyline } from './utils/polyline';
import type { Coordinates, Place, RouteResponse } from './types';
import { MapPin, Bot, Volume2, VolumeX, Locate, Sparkles, Building, Coffee, Trophy, Home, ArrowRight } from 'lucide-react';

export default function App() {
  const { places } = usePlaces();
  const serviceIsOnline = useHealth();
  const { coordinates: currentLocation, accuracy: locationAccuracy, requestLocation } = useGeolocation();

  // Navigation Flow & Tab State
  const [activeTab, setActiveTab] = useState<'ai' | 'inside-block' | 'faculty' | 'events' | 'admin'>('ai');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Category filter on map: DEFAULTS TO 'academic' ONLY ON MAP LAUNCH
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>('academic');

  // Directions State (Multi-route capable)
  const [directions, setDirections] = useState<DirectionsState>({
    isActive: false,
    from: null,
    to: null,
    routes: [],
    activeRouteIndex: 0,
    steps: [],
    routePath: [],
    totalDistance: 0,
    currentStepIndex: 0,
    milestones: [],
  });

  const [pickingFor, setPickingFor] = useState<'from' | 'to' | null>(null);
  const [mapPickedLocation, setMapPickedLocation] = useState<CampusLocation | null>(null);

  // 3D Indoor Navigation targeting
  const [indoorTargetBlock, setIndoorTargetBlock] = useState<'BLOCK A' | 'BLOCK B' | 'BLOCK C'>('BLOCK B');
  const [indoorTargetFloor, setIndoorTargetFloor] = useState<number>(1);

  // Resizable panel width on Desktop
  const [panelWidth, setPanelWidth] = useState(440);
  const isDraggingHRef = useRef(false);

  // Voice Navigation
  const { isEnabled: isVoiceEnabled, toggleVoice, speak } = useVoiceNavigation();

  // Live Turn-by-Turn Guidance hook
  const activeRouteResponse: RouteResponse | null = useMemo(() => {
    if (!directions.isActive || !directions.from || !directions.to || directions.routePath.length === 0) {
      return null;
    }
    const distKm = (directions.totalDistance || 100) / 1000;
    return {
      success: true,
      from: { name: directions.from.name, lat: directions.from.coords[0], lng: directions.from.coords[1] },
      to: { name: directions.to.name, lat: directions.to.coords[0], lng: directions.to.coords[1], id: directions.to.id },
      route: {
        distanceKm: distKm,
        durationSec: Math.round((distKm / 5) * 3600),
        durationMin: Math.max(1, Math.round(distKm / 0.08)),
        encodedShape: encodePolyline(directions.routePath),
        instructions: (directions.milestones || []).map((m) => ({
          instruction: m.instruction,
          street: 'Campus Path',
          distanceKm: 0.05,
          durationSec: 30,
        })),
      },
    };
  }, [directions]);

  useLiveGuidance({
    route: activeRouteResponse,
    currentLocation,
    places,
  });

  // Handle Horizontal Resize (Desktop Left Panel)
  const handleHMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingHRef.current) return;
      const newWidth = ev.clientX - 68; // navbar rail is 68px wide
      const clamped = Math.max(320, Math.min(800, newWidth));
      setPanelWidth(clamped);
    };
    const onMouseUp = () => {
      isDraggingHRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Map Click handler for picking points
  const handleMapClick = (coords: Coordinates) => {
    if (pickingFor) {
      const pickedLoc: CampusLocation = {
        id: `picked-${Date.now()}`,
        coords: [coords.lat, coords.lng],
        name: `Selected Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
        type: 'amenity',
        categoryLabel: 'Custom Point',
        description: 'Selected on map',
        image: '/temple.jpeg',
      };
      setMapPickedLocation(pickedLoc);
      setPickingFor(null);
    }
  };

  return (
    <div className="dishaa-workspace-container">
      {/* ── 1. UNIFIED NAVIGATION RAIL (Left on desktop, Bottom on mobile) ── */}
      <BottomNavbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab as any);
          setIsChatCollapsed(false);
        }}
        onGoWelcome={() => {
          window.location.hash = '';
        }}
        isChatOpen={!isChatCollapsed}
        onToggleChat={() => setIsChatCollapsed(!isChatCollapsed)}
      />

      {/* ── 2. RESIZABLE LEFT FEATURE PANEL ── */}
      {!isChatCollapsed && (
        <aside
          className="dishaa-feature-panel"
          style={{ width: `${panelWidth}px` }}
        >
          {activeTab === 'ai' && (
            <UnifiedRouteAndAiPanel
              onClose={() => setIsChatCollapsed(true)}
              onDirectionsChange={(st) => setDirections(st)}
              onPickOnMap={(mode) => setPickingFor(mode)}
              mapPickedLocation={mapPickedLocation}
              directionsState={directions}
              userCoordinates={currentLocation}
              onOpenIndoorViewer={(blk, fl) => {
                setIndoorTargetBlock(blk as any);
                setIndoorTargetFloor(fl);
                setActiveTab('inside-block');
              }}
            />
          )}

          {activeTab === 'inside-block' && (
            <InsideBlockModal
              isOpen={true}
              isInline={true}
              initialBlock={indoorTargetBlock}
              initialFloor={indoorTargetFloor}
              onClose={() => setIsChatCollapsed(true)}
            />
          )}

          {activeTab === 'faculty' && (
            <FacultyFinderPanel
              onClose={() => setIsChatCollapsed(true)}
              onSelectFacultyLocation={(blk, fl) => {
                setIndoorTargetBlock(blk as any);
                setIndoorTargetFloor(fl);
                setActiveTab('inside-block');
              }}
              onNavigateToBlock={(blk) => {
                const loc = campusLocations.find((c) => c.name.toLowerCase().includes(blk.toLowerCase()));
                if (loc) {
                  setDirections((prev) => ({ ...prev, to: loc }));
                  setActiveTab('ai');
                }
              }}
            />
          )}

          {activeTab === 'events' && (
            <EventsModal
              isOpen={true}
              onClose={() => setIsChatCollapsed(true)}
              onNavigateToLocation={(locText) => {
                const match = campusLocations.find((c) => locText.toLowerCase().includes(c.name.toLowerCase()));
                if (match) {
                  setDirections((prev) => ({ ...prev, to: match }));
                  setActiveTab('ai');
                }
              }}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPortalModal
              isOpen={true}
              onClose={() => setIsChatCollapsed(true)}
              onSelectFacultyLocation={(blk, fl) => {
                setIndoorTargetBlock(blk as any);
                setIndoorTargetFloor(fl);
                setActiveTab('inside-block');
              }}
            />
          )}
        </aside>
      )}

      {/* ── 3. DRAGGABLE RESIZER BAR (Desktop boundary) ── */}
      {!isChatCollapsed && (
        <div
          className="dishaa-resizer-bar"
          onMouseDown={handleHMouseDown}
          title="Drag to resize panel boundary"
        >
          <div className="resizer-dots">
            <span className="resizer-dot" />
            <span className="resizer-dot" />
            <span className="resizer-dot" />
          </div>
        </div>
      )}

      {/* ── 4. MAIN CAMPUS MAP WORKSPACE ── */}
      <main className="dishaa-map-workspace">
        {/* Minimalist Top Bar */}
        <header
          style={{
            height: '46px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 40,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
            <MapPin size={16} color="#2563eb" />
            <span>G.H. Raisoni College &bull; Campus Navigation</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Locate User button */}
            <button
              onClick={() => requestLocation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
              title="Locate my position on map"
            >
              <Locate size={14} color="#2563eb" />
              <span>Locate Me</span>
            </button>

            {/* Voice Navigation toggle */}
            <button
              onClick={toggleVoice}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: isVoiceEnabled ? '1px solid #86efac' : '1px solid #cbd5e1',
                backgroundColor: isVoiceEnabled ? '#f0fdf4' : '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                color: isVoiceEnabled ? '#15803d' : '#64748b',
                cursor: 'pointer',
              }}
              title="Toggle Voice Guidance"
            >
              {isVoiceEnabled ? <Volume2 size={14} color="#15803d" /> : <VolumeX size={14} color="#94a3b8" />}
              <span>{isVoiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>

            {/* Toggle Left Feature Panel */}
            <button
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #2563eb',
                backgroundColor: '#eff6ff',
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                cursor: 'pointer',
              }}
            >
              <Bot size={14} />
              <span>{isChatCollapsed ? 'Open Planner' : 'Hide Panel'}</span>
            </button>
          </div>
        </header>

        {/* Live Emergency Broadcast Banner */}
        <BroadcastBanner />

        {/* Category Filter Chips Bar: Defaulting to Academic Only */}
        <div
          style={{
            padding: '6px 14px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            zIndex: 35,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Map POIs:
          </span>
          {[
            { id: 'academic', label: 'Academic Blocks (Default)', icon: Building },
            { id: 'food', label: 'Food & Cafés', icon: Coffee },
            { id: 'hostel', label: 'Hostels', icon: Home },
            { id: 'sports', label: 'Sports', icon: Trophy },
            { id: 'all', label: 'All Places', icon: MapPin },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = mapCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setMapCategoryFilter(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                  color: isSelected ? '#2563eb' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={12} color={isSelected ? '#2563eb' : '#64748b'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Leaflet Campus Map Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <CampusMap
            places={places}
            selectedPlace={null}
            currentLocation={currentLocation}
            locationAccuracy={locationAccuracy}
            originPin={null}
            destinationPin={null}
            route={activeRouteResponse}
            routeCoordinates={decodePolyline(activeRouteResponse?.route.encodedShape || null)}
            multiRoutes={directions.routes}
            activeRouteIndex={directions.activeRouteIndex}
            milestones={directions.milestones}
            currentStepIndex={directions.currentStepIndex}
            resetVersion={0}
            categoryFilter={mapCategoryFilter}
            onSelectPlace={(p) => {
              const match = campusLocations.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
              if (match) {
                setDirections((prev) => ({ ...prev, to: match }));
                setActiveTab('ai');
                setIsChatCollapsed(false);
              }
            }}
            onNavigateToPlace={(p) => {
              const match = campusLocations.find((c) => c.name.toLowerCase() === p.name.toLowerCase()) || {
                id: p.id,
                name: p.name,
                coords: [p.location.lat, p.location.lng] as [number, number],
                type: 'block' as const,
                categoryLabel: 'Academic Block',
                description: p.name,
                image: '/temple.jpeg',
              };
              setDirections((prev) => ({ ...prev, to: match }));
              setActiveTab('ai');
              setIsChatCollapsed(false);
            }}
            onOpenIndoorViewer={(blk, fl) => {
              setIndoorTargetBlock(blk as any);
              setIndoorTargetFloor(fl);
              setActiveTab('inside-block');
              setIsChatCollapsed(false);
            }}
            onMapClick={handleMapClick}
            onSetDestination={() => {}}
            onNavigate={() => {}}
          />

          {/* Floating Active Navigation Bottom Guidance Card with NEXT STEP button */}
          {directions.isActive && directions.milestones && directions.milestones.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                width: '92%',
                maxWidth: '480px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                color: '#ffffff',
                backdropFilter: 'blur(12px)',
                padding: '12px 16px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span
                  style={{
                    backgroundColor: '#1e3a8a',
                    color: '#93c5fd',
                    fontSize: '10px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #2563eb',
                  }}
                >
                  STEP {(directions.currentStepIndex || 0) + 1} OF {directions.milestones.length}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ~{directions.totalDistance}m total &bull; ~{Math.max(1, Math.round(directions.totalDistance / 80))} min walk
                </span>
              </div>

              <h5 style={{ margin: '0 0 3px 0', fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                {directions.milestones[directions.currentStepIndex || 0]?.title || 'Campus Navigation'}
              </h5>

              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.35 }}>
                {directions.milestones[directions.currentStepIndex || 0]?.instruction}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const prev = Math.max(0, (directions.currentStepIndex || 0) - 1);
                    setDirections((prevD) => ({ ...prevD, currentStepIndex: prev }));
                    if (directions.milestones[prev] && isVoiceEnabled) {
                      speak(directions.milestones[prev].instruction);
                    }
                  }}
                  disabled={(directions.currentStepIndex || 0) === 0}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: (directions.currentStepIndex || 0) === 0 ? 'not-allowed' : 'pointer',
                    opacity: (directions.currentStepIndex || 0) === 0 ? 0.4 : 1,
                  }}
                >
                  &larr; Prev
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = ((directions.currentStepIndex || 0) + 1) % directions.milestones.length;
                    setDirections((prevD) => ({ ...prevD, currentStepIndex: next }));
                    if (directions.milestones[next] && isVoiceEnabled) {
                      speak(directions.milestones[next].instruction);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
                  }}
                >
                  <span>
                    {(directions.currentStepIndex || 0) === directions.milestones.length - 1
                      ? 'Reached Destination (Restart)'
                      : 'Next Step'}
                  </span>
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDirections({
                      isActive: false,
                      from: null,
                      to: null,
                      routes: [],
                      steps: [],
                      routePath: [],
                      totalDistance: 0,
                      currentStepIndex: 0,
                      milestones: [],
                    });
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    backgroundColor: 'rgba(239,68,68,0.2)',
                    color: '#fca5a5',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Exit Navigation"
                >
                  Exit
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
