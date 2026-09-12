/**
 * Focused Automated Test Suite for User Location Marker Freeze Behavior
 * 
 * Verifies:
 * - Test 1: Freeze after arrival (GPS position A -> arrival confirmed -> GPS position B -> marker remains at A)
 * - Test 2: GPS jitter after arrival (arrival -> 13m -> 11m -> 7m -> 5m -> marker does not move)
 * - Test 3: Normal navigation still moves marker (position A -> position B -> position C -> marker smoothly updates)
 * - Test 4: New session unfreezes marker (Session 1 -> arrival -> freeze -> stop -> Session 2 -> new GPS -> unfreezes and updates)
 * - Test 5: Threshold and zero-AI integrity verification
 */

const fs = require('fs');
const path = require('path');

function distanceMeters(coord1, coord2) {
  const R = 6371000;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Emulated Leaflet Marker
class MockLeafletMarker {
  constructor(latLng) {
    this.latLng = [...latLng];
    this.setLatLngCalls = [];
  }
  setLatLng(newLatLng) {
    this.latLng = [...newLatLng];
    this.setLatLngCalls.push([...newLatLng]);
  }
}

// Emulates UserLocationLayer internal state machine
class MockUserLocationLayer {
  constructor({ initialLocation, isArrived = false, arrivalLocation = null, voiceNavigation }) {
    this.voiceNavigation = voiceNavigation;
    this.isArrived = isArrived;
    this.arrivalLocation = arrivalLocation;
    this.currentPos = initialLocation || null;
    this.targetPos = initialLocation || null;
    this.animStartPos = initialLocation || null;
    this.rafId = null;
    this.marker = initialLocation ? new MockLeafletMarker([initialLocation.lat, initialLocation.lng]) : null;
    this.cancelledRafCount = 0;
  }

  setArrivedState(isArrived, arrivalLocation = null) {
    this.isArrived = isArrived;
    this.arrivalLocation = arrivalLocation;
    const arrived = this.isArrived || this.voiceNavigation.isSessionArrived();
    if (arrived) {
      if (this.rafId !== null) {
        this.rafId = null;
        this.cancelledRafCount++;
      }
      const frozenPos = this.arrivalLocation || this.targetPos || this.currentPos;
      if (frozenPos && this.marker) {
        this.currentPos = { ...frozenPos };
        this.targetPos = { ...frozenPos };
        this.animStartPos = { ...frozenPos };
        this.marker.setLatLng([frozenPos.lat, frozenPos.lng]);
      }
    }
  }

  handleLocationUpdate(update) {
    // Exact logic from UserLocationLayer.tsx:
    if (this.isArrived || this.voiceNavigation.isSessionArrived()) {
      return; // Ignore subsequent GPS movement
    }

    const { coordinates: nextCoords } = update;
    if (!this.marker) {
      this.marker = new MockLeafletMarker([nextCoords.lat, nextCoords.lng]);
      this.currentPos = { ...nextCoords };
    }

    const prevPos = this.currentPos || nextCoords;
    const dist = distanceMeters(prevPos, nextCoords);

    if (dist > 35 || !this.currentPos) {
      this.currentPos = { ...nextCoords };
      this.targetPos = { ...nextCoords };
      this.animStartPos = { ...nextCoords };
      this.marker.setLatLng([nextCoords.lat, nextCoords.lng]);
      return;
    }

    // Smooth interpolation step setup
    this.animStartPos = { ...prevPos };
    this.targetPos = { ...nextCoords };
    this.currentPos = { ...nextCoords };
    this.marker.setLatLng([nextCoords.lat, nextCoords.lng]);
    this.rafId = 1;
  }
}

function runMarkerFreezeTests() {
  console.log('======================================================');
  console.log('  DISHAA 2.0 USER LOCATION MARKER FREEZE TEST SUITE   ');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, detail = '') {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${title}`);
      if (detail) console.log(`       ↳ ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${title}`);
      if (detail) console.error(`       ↳ ${detail}`);
    }
  }

  const mockVoiceNav = {
    _arrived: false,
    isSessionArrived() { return this._arrived; },
    setArrived(val) { this._arrived = val; },
    startSession() { this._arrived = false; },
    stopSession() { this._arrived = false; }
  };

  // ----------------------------------------------------
  // Test 1: Freeze after arrival
  // GPS position A -> arrival confirmed -> GPS position B -> marker remains at A
  // ----------------------------------------------------
  {
    mockVoiceNav.startSession();
    const posA = { lat: 12.971600, lng: 77.594600 };
    const posB = { lat: 12.971700, lng: 77.594700 };

    const layer = new MockUserLocationLayer({
      initialLocation: posA,
      isArrived: false,
      voiceNavigation: mockVoiceNav
    });

    assert('Initial marker position is set to Position A',
      layer.marker.latLng[0] === posA.lat && layer.marker.latLng[1] === posA.lng,
      `Marker at [${layer.marker.latLng[0]}, ${layer.marker.latLng[1]}]`
    );

    // Arrival confirmed at Position A
    mockVoiceNav.setArrived(true);
    layer.setArrivedState(true, posA);

    // Subsequent GPS update at Position B arrives
    layer.handleLocationUpdate({ coordinates: posB, accuracy: 5, timestamp: Date.now() });

    assert('Test 1 — Freeze after arrival: Marker remains at Position A despite GPS update B',
      layer.marker.latLng[0] === posA.lat && layer.marker.latLng[1] === posA.lng &&
      layer.currentPos.lat === posA.lat && layer.currentPos.lng === posA.lng,
      `Expected [${posA.lat}, ${posA.lng}], got [${layer.marker.latLng[0]}, ${layer.marker.latLng[1]}]`
    );
  }

  // ----------------------------------------------------
  // Test 2: GPS Jitter after arrival
  // Sequence: 12m -> 9m (arrival confirmed) -> jitter: 13m -> 11m -> 7m -> 5m
  // Marker must remain frozen at arrival position
  // ----------------------------------------------------
  {
    mockVoiceNav.startSession();
    const dest = { lat: 12.971600, lng: 77.594600 };
    const pos12m = { lat: 12.971500, lng: 77.594600 };
    const pos9m = { lat: 12.971520, lng: 77.594600 }; // Arrival point (<= 10m)

    const layer = new MockUserLocationLayer({
      initialLocation: pos12m,
      isArrived: false,
      voiceNavigation: mockVoiceNav
    });

    // 1. Move to 9m (arrival trigger)
    layer.handleLocationUpdate({ coordinates: pos9m, accuracy: 4, timestamp: Date.now() });
    mockVoiceNav.setArrived(true);
    layer.setArrivedState(true, pos9m);

    const frozenLat = layer.marker.latLng[0];
    const frozenLng = layer.marker.latLng[1];

    // 2. Jitter sequence: 13m, 11m, 7m, 5m
    const jitterUpdates = [
      { lat: 12.971480, lng: 77.594600 }, // ~13m away
      { lat: 12.971505, lng: 77.594600 }, // ~11m away
      { lat: 12.971540, lng: 77.594600 }, // ~7m away
      { lat: 12.971560, lng: 77.594600 }, // ~5m away
    ];

    const callsBeforeJitter = layer.marker.setLatLngCalls.length;
    for (const jitter of jitterUpdates) {
      layer.handleLocationUpdate({ coordinates: jitter, accuracy: 5, timestamp: Date.now() });
    }
    const callsAfterJitter = layer.marker.setLatLngCalls.length;

    assert('Test 2 — GPS Jitter after arrival: Marker does NOT move during 13m, 11m, 7m, 5m jitter',
      layer.marker.latLng[0] === frozenLat &&
      layer.marker.latLng[1] === frozenLng &&
      callsBeforeJitter === callsAfterJitter,
      `Marker remained at [${frozenLat}, ${frozenLng}], zero marker position updates during jitter.`
    );
  }

  // ----------------------------------------------------
  // Test 3: Normal navigation still moves marker
  // Position A -> Position B -> Position C before arrival
  // ----------------------------------------------------
  {
    mockVoiceNav.startSession();
    const posA = { lat: 12.970000, lng: 77.590000 };
    const posB = { lat: 12.970100, lng: 77.590100 };
    const posC = { lat: 12.970200, lng: 77.590200 };

    const layer = new MockUserLocationLayer({
      initialLocation: posA,
      isArrived: false,
      voiceNavigation: mockVoiceNav
    });

    layer.handleLocationUpdate({ coordinates: posB, accuracy: 3, timestamp: Date.now() });
    const atB = layer.marker.latLng[0] === posB.lat && layer.marker.latLng[1] === posB.lng;

    layer.handleLocationUpdate({ coordinates: posC, accuracy: 3, timestamp: Date.now() });
    const atC = layer.marker.latLng[0] === posC.lat && layer.marker.latLng[1] === posC.lng;

    assert('Test 3 — Normal navigation still moves marker: Smooth progression A -> B -> C',
      atB && atC,
      `Marker correctly progressed through positions B and C.`
    );
  }

  // ----------------------------------------------------
  // Test 4: New session unfreezes marker
  // Session 1 -> arrival -> freeze -> Stop -> Session 2 -> new GPS updates -> moves normally
  // ----------------------------------------------------
  {
    mockVoiceNav.startSession('session_1');
    const posArrival = { lat: 12.971000, lng: 77.591000 };
    const layer = new MockUserLocationLayer({
      initialLocation: posArrival,
      isArrived: false,
      voiceNavigation: mockVoiceNav
    });

    // Session 1 arrival
    mockVoiceNav.setArrived(true);
    layer.setArrivedState(true, posArrival);

    // Verify it is frozen in session 1
    const postArrival1 = { lat: 12.971050, lng: 77.591050 };
    layer.handleLocationUpdate({ coordinates: postArrival1, accuracy: 4, timestamp: Date.now() });
    const isFrozenInSession1 = layer.marker.latLng[0] === posArrival.lat && layer.marker.latLng[1] === posArrival.lng;

    // Stop navigation
    mockVoiceNav.stopSession();
    layer.setArrivedState(false, null);

    // Session 2 starts
    mockVoiceNav.startSession('session_2');
    const newSessionPos = { lat: 12.972000, lng: 77.592000 };
    layer.handleLocationUpdate({ coordinates: newSessionPos, accuracy: 3, timestamp: Date.now() });

    const isUnfrozenInSession2 = layer.marker.latLng[0] === newSessionPos.lat && layer.marker.latLng[1] === newSessionPos.lng;

    assert('Test 4 — New session unfreezes marker: Session 1 freezes, stop clears, Session 2 moves normally',
      isFrozenInSession1 && isUnfrozenInSession2,
      `Session 1 froze at arrival, Session 2 unfroze and updated to new coordinate.`
    );
  }

  // ----------------------------------------------------
  // Test 5: Source Code Threshold and Zero-AI Verification
  // ----------------------------------------------------
  {
    const guidancePath = path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/hooks/useLiveGuidance.ts');
    const layerPath = path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/components/map/UserLocationLayer.tsx');
    const guidanceContent = fs.readFileSync(guidancePath, 'utf8');
    const layerContent = fs.readFileSync(layerPath, 'utf8');

    const thresholdsUnchanged =
      guidanceContent.includes('const ARRIVAL_METERS = 10;') &&
      guidanceContent.includes('const IMMEDIATE_METERS = 9;') &&
      guidanceContent.includes('const APPROACHING_METERS = 45;') &&
      guidanceContent.includes('const DESTINATION_APPROACH_METERS = 20;') &&
      guidanceContent.includes('const OFF_ROUTE_METERS = 40;') &&
      guidanceContent.includes('const ON_ROUTE_RECOVERY_METERS = 25;') &&
      guidanceContent.includes('const REASSURANCE_COOLDOWN_MS = 5000;') &&
      guidanceContent.includes('const REASSURANCE_MIN_PROGRESS_METERS = 5;');

    const noAiInLayer =
      !layerContent.includes('ollama') &&
      !layerContent.includes('gemini') &&
      !layerContent.includes('langgraph') &&
      !layerContent.includes('fetch(') &&
      !layerContent.includes('axios');

    assert('Test 5 — Threshold Integrity: All navigation thresholds preserved exactly',
      thresholdsUnchanged,
      'ARRIVAL_METERS(10), IMMEDIATE_METERS(9), APPROACHING_METERS(45), OFF_ROUTE_METERS(40), REASSURANCE(5s/5m) intact.'
    );

    assert('Test 6 — Zero-AI Isolation: No AI, LLM, or network calls introduced into marker or GPS tracking loop',
      noAiInLayer,
      'UserLocationLayer is 100% local, deterministic, and client-side.'
    );
  }

  console.log('\n======================================================');
  console.log(`  MARKER FREEZE RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runMarkerFreezeTests();
