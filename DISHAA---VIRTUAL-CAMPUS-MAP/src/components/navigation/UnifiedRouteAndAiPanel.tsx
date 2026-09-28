import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Mic, Sparkles, Navigation, MapPin, X, ArrowRight,
  Building, Coffee, Trophy, Volume2, VolumeX, Locate, Layers
} from 'lucide-react';
import { campusLocations, DirectionsState, CampusLocation, RouteOption, StepMilestone } from '../../lib/campusData';
import { findMultipleRoutes } from '../../lib/pathfinding';
import { assistantApi } from '../../services/api/assistantApi';
import type { Coordinates } from '../../types';

interface UnifiedRouteAndAiPanelProps {
  onClose?: () => void;
  onDirectionsChange: (state: DirectionsState) => void;
  onPickOnMap: (mode: 'from' | 'to') => void;
  mapPickedLocation: CampusLocation | null;
  directionsState: DirectionsState;
  onOpenIndoorViewer?: (block: string, floor: number) => void;
  userCoordinates: Coordinates | null;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export function UnifiedRouteAndAiPanel({
  onClose,
  onDirectionsChange,
  onPickOnMap,
  mapPickedLocation,
  directionsState,
  onOpenIndoorViewer,
  userCoordinates,
}: UnifiedRouteAndAiPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'routes' | 'chat'>('routes');

  // Locations
  const [fromQuery, setFromQuery] = useState(directionsState.from?.name || '');
  const [toQuery, setToQuery] = useState(directionsState.to?.name || '');
  const [fromLocation, setFromLocation] = useState<CampusLocation | null>(directionsState.from || null);
  const [toLocation, setToLocation] = useState<CampusLocation | null>(directionsState.to || null);

  const [fromDropdown, setFromDropdown] = useState(false);
  const [toDropdown, setToDropdown] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Namaste! I am DISHAA 2.0 AI Assistant. I can guide you anywhere on campus, locate labs & classrooms, or find professors.',
      timestamp: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // If a point was picked on map
  useEffect(() => {
    if (mapPickedLocation) {
      if (!fromLocation) {
        setFromLocation(mapPickedLocation);
        setFromQuery(mapPickedLocation.name);
      } else {
        setToLocation(mapPickedLocation);
        setToQuery(mapPickedLocation.name);
      }
    }
  }, [mapPickedLocation]);

  // Recalculate routes whenever fromLocation or toLocation changes
  useEffect(() => {
    if (fromLocation && toLocation) {
      calculatePath(fromLocation, toLocation);
    }
  }, [fromLocation, toLocation]);

  const calculatePath = (start: CampusLocation, end: CampusLocation) => {
    const multiRoutes = findMultipleRoutes(start, end);
    if (multiRoutes.length > 0) {
      const activeIdx = 0;
      const primary = multiRoutes[activeIdx];
      onDirectionsChange({
        isActive: true,
        from: start,
        to: end,
        routes: multiRoutes,
        activeRouteIndex: activeIdx,
        routePath: primary.path,
        totalDistance: primary.distance,
        steps: primary.steps,
        milestones: primary.milestones,
        currentStepIndex: 0,
      });
    }
  };

  const handleSelectRouteIndex = (idx: number) => {
    if (!directionsState.routes || !directionsState.routes[idx]) return;
    const selected = directionsState.routes[idx];
    onDirectionsChange({
      ...directionsState,
      activeRouteIndex: idx,
      routePath: selected.path,
      totalDistance: selected.distance,
      steps: selected.steps,
      milestones: selected.milestones,
      currentStepIndex: 0,
    });
  };

  const handleClearRoute = () => {
    setFromLocation(null);
    setToLocation(null);
    setFromQuery('');
    setToQuery('');
    onDirectionsChange({
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
  };

  const handleUseCurrentLocation = () => {
    if (!userCoordinates) {
      alert('Location not acquired yet. Please click the GPS locate button on the map.');
      return;
    }
    const currentLoc: CampusLocation = {
      id: 'current-user-pos',
      coords: [userCoordinates.lat, userCoordinates.lng],
      name: 'My Current Location (GPS)',
      type: 'amenity',
      categoryLabel: 'GPS Position',
      description: 'Your live device location',
      image: '/temple.jpeg',
    };
    setFromLocation(currentLoc);
    setFromQuery('My Current Location (GPS)');
  };

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsThinking(true);

    try {
      const response = await assistantApi.chat({
        message: text,
        currentLocation: userCoordinates,
        navigationActive: directionsState.isActive,
      });

      const replyText = response.response || 'I am ready to help you navigate campus.';
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Sorry, I had trouble answering that. You can choose destinations directly from the Route Planner above.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const filterLocations = (q: string) => {
    if (!q.trim()) return campusLocations.slice(0, 8);
    return campusLocations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q.toLowerCase()) ||
        loc.categoryLabel.toLowerCase().includes(q.toLowerCase())
    );
  };

  return (
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
      {/* Top Segmented Control: [Route Planner] | [AI Chat] */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveSubTab('routes')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'routes' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'routes' ? '#2563eb' : '#64748b',
              boxShadow: activeSubTab === 'routes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Navigation size={14} />
            <span>Routes</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chat')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeSubTab === 'chat' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'chat' ? '#2563eb' : '#64748b',
              boxShadow: activeSubTab === 'chat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Bot size={14} />
            <span>AI Chat</span>
          </button>
        </div>

        {onClose && (
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
        )}
      </div>

      {/* Main Body */}
      {activeSubTab === 'routes' ? (
        /* ── ROUTE PLANNER VIEW ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Form: Start and Destination */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            {/* Start point */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '10px', top: '10px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <input
                type="text"
                value={fromQuery}
                onFocus={() => { setFromDropdown(true); setToDropdown(false); }}
                onChange={(e) => { setFromQuery(e.target.value); setFromDropdown(true); }}
                placeholder="Choose starting location..."
                style={{ width: '100%', padding: '8px 12px 8px 28px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              {fromDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                  <div
                    onClick={handleUseCurrentLocation}
                    style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Locate size={14} />
                    <span>Use My Current Location (GPS)</span>
                  </div>
                  {filterLocations(fromQuery).map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setFromLocation(loc);
                        setFromQuery(loc.name);
                        setFromDropdown(false);
                      }}
                      style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    >
                      <strong>{loc.name}</strong> <span style={{ fontSize: '10px', color: '#64748b' }}>({loc.categoryLabel})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination point */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '10px', top: '10px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <input
                type="text"
                value={toQuery}
                onFocus={() => { setToDropdown(true); setFromDropdown(false); }}
                onChange={(e) => { setToQuery(e.target.value); setToDropdown(true); }}
                placeholder="Choose destination..."
                style={{ width: '100%', padding: '8px 12px 8px 28px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              {toDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                  {filterLocations(toQuery).map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setToLocation(loc);
                        setToQuery(loc.name);
                        setToDropdown(false);
                      }}
                      style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    >
                      <strong>{loc.name}</strong> <span style={{ fontSize: '10px', color: '#64748b' }}>({loc.categoryLabel})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onPickOnMap('from')}
                style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600, border: '1px dashed #94a3b8', borderRadius: '6px', background: '#f8fafc', cursor: 'pointer' }}
              >
                📍 Pick Start on Map
              </button>
              <button
                onClick={() => onPickOnMap('to')}
                style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600, border: '1px dashed #94a3b8', borderRadius: '6px', background: '#f8fafc', cursor: 'pointer' }}
              >
                🏁 Pick Destination
              </button>
              {directionsState.isActive && (
                <button
                  onClick={handleClearRoute}
                  style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600, border: 'none', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Multi-Route Selection (Route 1, Route 2, Route 3) */}
          {directionsState.routes && directionsState.routes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Alternate Route Choices ({directionsState.routes.length})
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {directionsState.routes.map((rt, idx) => {
                  const isSelected = directionsState.activeRouteIndex === idx;
                  return (
                    <button
                      key={rt.id}
                      onClick={() => handleSelectRouteIndex(idx)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: `2px solid ${rt.color}`,
                        backgroundColor: isSelected ? rt.color : '#ffffff',
                        color: isSelected ? '#ffffff' : '#0f172a',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >
                      <span>Route {idx + 1}</span>
                      <span style={{ fontSize: '10px', opacity: 0.9 }}>{rt.distance}m</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Navigation Step Progress & Next Step Control */}
          {directionsState.milestones && directionsState.milestones.length > 0 && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
                  Live Step Guidance
                </span>
                <span
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    fontWeight: 800,
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                  }}
                >
                  STEP {(directionsState.currentStepIndex || 0) + 1} OF {directionsState.milestones.length}
                </span>
              </div>

              {/* Current Step Instruction */}
              {directionsState.milestones[directionsState.currentStepIndex || 0] && (
                <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    {directionsState.milestones[directionsState.currentStepIndex || 0].title}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                    {directionsState.milestones[directionsState.currentStepIndex || 0].instruction}
                  </span>
                </div>
              )}

              {/* Prev and Next Step Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const prev = Math.max(0, (directionsState.currentStepIndex || 0) - 1);
                    onDirectionsChange({ ...directionsState, currentStepIndex: prev });
                  }}
                  disabled={(directionsState.currentStepIndex || 0) === 0}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: (directionsState.currentStepIndex || 0) === 0 ? 'not-allowed' : 'pointer',
                    opacity: (directionsState.currentStepIndex || 0) === 0 ? 0.5 : 1,
                  }}
                >
                  &larr; Prev
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(directionsState.milestones.length - 1, (directionsState.currentStepIndex || 0) + 1);
                    onDirectionsChange({ ...directionsState, currentStepIndex: next });
                  }}
                  disabled={(directionsState.currentStepIndex || 0) === directionsState.milestones.length - 1}
                  style={{
                    flex: 1,
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: (directionsState.currentStepIndex || 0) === directionsState.milestones.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: (directionsState.currentStepIndex || 0) === directionsState.milestones.length - 1 ? 0.5 : 1,
                    boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                  }}
                >
                  <span>
                    {(directionsState.currentStepIndex || 0) === directionsState.milestones.length - 1
                      ? 'Destination Reached'
                      : `Next Step (${(directionsState.currentStepIndex || 0) + 2})`}
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Turn-by-Turn Steps */}
          {directionsState.milestones && directionsState.milestones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  All Turn Instructions
                </span>
                <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>
                  ~{directionsState.totalDistance}m &bull; ~{Math.max(1, Math.round(directionsState.totalDistance / 80))} min walk
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {directionsState.milestones.map((ms, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontWeight: 800,
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {ms.stepNumber}
                    </span>
                    <div>
                      <strong style={{ display: 'block', color: '#1e293b' }}>{ms.title}</strong>
                      <span style={{ color: '#64748b' }}>{ms.instruction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>Frequent Destinations</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {['B Block Canteen', 'Xerox Center', 'Sports Room - B Block', 'Temple', 'Account /Student / Scholorship Section'].map((placeName) => (
                <button
                  key={placeName}
                  onClick={() => {
                    const match = campusLocations.find((c) => c.name === placeName);
                    if (match) {
                      setToLocation(match);
                      setToQuery(match.name);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontSize: '10px',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {placeName}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── AI CHAT VIEW ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Chat Messages */}
          <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: m.sender === 'user' ? '#2563eb' : '#f1f5f9',
                  color: m.sender === 'user' ? '#ffffff' : '#0f172a',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  lineHeight: 1.4,
                }}
              >
                {m.text}
              </div>
            ))}
            {isThinking && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '12px', fontSize: '11px', color: '#64748b' }}>
                Thinking...
              </div>
            )}
          </div>

          {/* Quick Chips */}
          <div style={{ padding: '6px 12px', display: 'flex', gap: '6px', overflowX: 'auto', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            {['Take me to Canteen', 'Where is Account Section?', 'Show Block B 4th floor'].map((txt) => (
              <button
                key={txt}
                onClick={() => handleSendChat(txt)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '10px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {txt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div style={{ padding: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
              placeholder="Ask anything about campus..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <button
              onClick={() => handleSendChat()}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
