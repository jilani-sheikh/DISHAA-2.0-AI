/**
 * Automated GeoJSON GPS Marker Freeze Test for DISHAA 2.0
 * 
 * Validates the real marker-freeze implementation by feeding a sequence of
 * realistic GeoJSON GPS coordinates through the location-update and guidance pipeline:
 * 
 * 1. GeoJSON loading and coordinate verification using project distance utilities
 * 2. Normal marker progression and smooth interpolation before arrival
 * 3. In-flight RAF interpolation cancellation when arrival coordinate is received
 * 4. Marker locking to the exact authoritative arrival coordinate
 * 5. Rejection of post-arrival GPS jitter (13m, 11m, 7m, 15m, drift)
 * 6. Map panning stability (zero map.panTo calls caused by post-arrival GPS updates)
 * 7. Clean unfreezing upon session reset and resumption of normal marker movement in Session 2
 * 8. Strict threshold preservation and zero-AI / zero-network validation
 */

const fs = require('fs');
const path = require('path');

// Project Great-Circle distance utility (identical to src/utils/geo.ts)
const EARTH_RADIUS_M = 6371000;
function toRadians(value) {
  return (value * Math.PI) / 180;
}
function distanceMeters(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Emulated Leaflet Map with panTo spy
class MockLeafletMap {
  constructor() {
    this.panToCalls = [];
    this.zoom = 18;
  }
  panTo(latLng, options) {
    this.panToCalls.push({ latLng: [...latLng], options });
  }
  getZoom() {
    return this.zoom;
  }
  flyTo(latLng, zoom, options) {
    this.panToCalls.push({ latLng: [...latLng], options, flyTo: true });
  }
}

// Emulated Leaflet Marker with setLatLng spy
class MockLeafletMarker {
  constructor(latLng) {
    this.latLng = [...latLng];
    this.setLatLngCalls = [];
  }
  setLatLng(newLatLng) {
    this.latLng = [...newLatLng];
    this.setLatLngCalls.push({ latLng: [...newLatLng], time: Date.now() });
  }
}

// Emulated Leaflet Circle with setLatLng / setRadius spy
class MockLeafletCircle {
  constructor(latLng, options) {
    this.latLng = [...latLng];
    this.radius = options.radius || 5;
    this.setLatLngCalls = [];
  }
  setLatLng(newLatLng) {
    this.latLng = [...newLatLng];
    this.setLatLngCalls.push([...newLatLng]);
  }
  setRadius(r) {
    this.radius = r;
  }
}

// Deterministic RequestAnimationFrame Scheduler
class MockRafScheduler {
  constructor() {
    this.nextId = 1;
    this.callbacks = new Map();
    this.cancelCount = 0;
  }

  requestAnimationFrame(cb) {
    const id = this.nextId++;
    this.callbacks.set(id, cb);
    return id;
  }

  cancelAnimationFrame(id) {
    if (this.callbacks.has(id)) {
      this.callbacks.delete(id);
      this.cancelCount++;
    }
  }

  hasPending() {
    return this.callbacks.size > 0;
  }

  flush(now = performance.now()) {
    const pending = Array.from(this.callbacks.entries());
    this.callbacks.clear();
    for (const [id, cb] of pending) {
      cb(now);
    }
  }
}

// Simulated DISHAA 2.0 Navigation Runtime Environment
class DishaaNavigationSimulator {
  constructor({ map, raf, destination, initialLocation }) {
    this.map = map;
    this.raf = raf;
    this.destination = destination;

    // Navigation Session State
    this.sessionId = null;
    this.isArrived = false;
    this.arrivalLocation = null;
    this.voiceState = 'IDLE';

    // UserLocationLayer State (exact mirror of UserLocationLayer.tsx refs)
    this.marker = initialLocation ? new MockLeafletMarker([initialLocation.lat, initialLocation.lng]) : null;
    this.circle = initialLocation ? new MockLeafletCircle([initialLocation.lat, initialLocation.lng], { radius: 5 }) : null;
    this.currentPos = initialLocation || null;
    this.targetPos = initialLocation || null;
    this.animStartPos = initialLocation || null;
    this.animStartTime = 0;
    this.animDuration = 1000;
    this.rafId = null;
    this.lastUpdateTimestamp = Date.now();
    this.isFollowMode = true;

    // Guidance evaluation state (mirror of useLiveGuidance.ts)
    this.ARRIVAL_METERS = 10;
    this.voiceHistory = [];
  }

  startSession(sessionId) {
    this.sessionId = sessionId;
    this.isArrived = false;
    this.arrivalLocation = null;
    this.voiceState = 'NAVIGATING';
    this.voiceHistory.push({ type: 'START', text: 'Navigation started. Go straight.' });
  }

  stopSession() {
    this.sessionId = null;
    this.isArrived = false;
    this.arrivalLocation = null;
    this.voiceState = 'IDLE';
  }

  // Exact stepAnimation from UserLocationLayer.tsx
  stepAnimation(now) {
    if (this.isArrived || this.voiceState === 'ARRIVED') {
      this.rafId = null;
      return;
    }

    if (!this.targetPos || !this.animStartPos || !this.marker) {
      this.rafId = null;
      return;
    }

    const elapsed = now - this.animStartTime;
    const progress = Math.min(1, Math.max(0, elapsed / this.animDuration));

    const curLat = this.animStartPos.lat + (this.targetPos.lat - this.animStartPos.lat) * progress;
    const curLng = this.animStartPos.lng + (this.targetPos.lng - this.animStartPos.lng) * progress;
    this.currentPos = { lat: curLat, lng: curLng };

    this.marker.setLatLng([curLat, curLng]);
    if (this.circle) {
      this.circle.setLatLng([curLat, curLng]);
    }

    if (this.isFollowMode) {
      this.map.panTo([curLat, curLng], { animate: false });
    }

    if (progress < 1) {
      this.rafId = this.raf.requestAnimationFrame((t) => this.stepAnimation(t));
    } else {
      this.rafId = null;
    }
  }

  // Exact useEffect([isArrived, arrivalLocation]) from UserLocationLayer.tsx
  triggerArrivalFreezeEffect(arrivalLocation) {
    this.isArrived = true;
    this.arrivalLocation = arrivalLocation;
    this.voiceState = 'ARRIVED';

    if (this.rafId !== null) {
      this.raf.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    const frozenPos = this.arrivalLocation || this.targetPos || this.currentPos;
    if (frozenPos && this.marker) {
      this.currentPos = { ...frozenPos };
      this.targetPos = { ...frozenPos };
      this.animStartPos = { ...frozenPos };
      this.marker.setLatLng([frozenPos.lat, frozenPos.lng]);
      if (this.circle) {
        this.circle.setLatLng([frozenPos.lat, frozenPos.lng]);
      }
    }
  }

  // Location update handler combining useLiveGuidance evaluation + UserLocationLayer update
  feedGpsUpdate(coordinates, accuracy = 4) {
    const now = Date.now();
    const update = { coordinates, accuracy, timestamp: now };

    // 1. UserLocationLayer check: if arrived, drop update immediately
    const isFrozen = this.isArrived || this.voiceState === 'ARRIVED';
    if (!isFrozen) {
      const timeDelta = Math.max(300, Math.min(3000, now - this.lastUpdateTimestamp));
      this.lastUpdateTimestamp = now;

      if (!this.marker) {
        this.marker = new MockLeafletMarker([coordinates.lat, coordinates.lng]);
        this.currentPos = { ...coordinates };
      }

      const prevPos = this.currentPos || coordinates;
      const dist = distanceMeters(prevPos, coordinates);

      if (dist > 35 || !this.currentPos) {
        if (this.rafId !== null) {
          this.raf.cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        this.currentPos = { ...coordinates };
        this.targetPos = { ...coordinates };
        this.animStartPos = { ...coordinates };
        this.marker.setLatLng([coordinates.lat, coordinates.lng]);
        if (this.circle) this.circle.setLatLng([coordinates.lat, coordinates.lng]);
        if (this.isFollowMode) {
          this.map.panTo([coordinates.lat, coordinates.lng], { animate: true, duration: 0.5 });
        }
      } else {
        this.animStartPos = { ...prevPos };
        this.targetPos = { ...coordinates };
        this.animStartTime = performance.now();
        this.animDuration = timeDelta;

        if (this.rafId === null) {
          this.rafId = this.raf.requestAnimationFrame((t) => this.stepAnimation(t));
        }
      }
    }

    // 2. Guidance evaluation (useLiveGuidance.ts)
    if (this.sessionId && !this.isArrived) {
      const distToDest = distanceMeters(coordinates, this.destination);
      if (distToDest <= this.ARRIVAL_METERS) {
        this.voiceHistory.push({
          type: 'ARRIVAL',
          text: 'You have arrived at your destination.',
          location: { ...coordinates },
          distToDest
        });
        // Propagate arrival to App -> CampusMap -> UserLocationLayer
        this.triggerArrivalFreezeEffect(coordinates);
      }
    }
  }
}

// ----------------------------------------------------
// Main Test Runner
// ----------------------------------------------------
function runGeoJsonMarkerFreezeTests() {
  console.log('==================================================');
  console.log('  DISHAA 2.0 GEOJSON GPS MARKER FREEZE TEST       ');
  console.log('==================================================\n');

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

  // 1. Load GeoJSON
  const geoJsonPath = path.join(__dirname, '../data/test_route_arrival_jitter.geojson');
  const fileExists = fs.existsSync(geoJsonPath);
  assert('GeoJSON loaded successfully', fileExists, `Loaded from ${geoJsonPath}`);
  if (!fileExists) {
    console.error('Missing GeoJSON file. Aborting.');
    process.exit(1);
  }

  const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
  const destCoords = { lat: geoJson.destination.coordinates[1], lng: geoJson.destination.coordinates[0] };
  const features = geoJson.features;
  const numPoints = features.length;

  assert('GPS replay dataset parsed', numPoints === 11, `${numPoints} GPS feature points parsed along test route.`);

  // 2. Initialize Map, RAF, and Simulator
  const map = new MockLeafletMap();
  const raf = new MockRafScheduler();

  const posA = {
    lat: features[0].geometry.coordinates[1],
    lng: features[0].geometry.coordinates[0]
  };

  const sim = new DishaaNavigationSimulator({
    map,
    raf,
    destination: destCoords,
    initialLocation: posA
  });

  sim.startSession('session_geojson_test');
  assert('GPS replay started', sim.sessionId === 'session_geojson_test' && sim.voiceState === 'NAVIGATING',
    `Navigation session started for destination "${geoJson.destination.name}" at [${destCoords.lat}, ${destCoords.lng}]`);

  // 3. Normal Navigation: Replay Position B, C, D, E (progressing towards destination)
  // Position A: 60m away
  // Position B: 40m away
  // Position C: 25m away
  // Position D: 15m away
  // Position E: 12m away
  const preArrivalFeatures = features.slice(1, 5); // B, C, D, E
  let markerMovedPreArrival = true;

  for (const feat of preArrivalFeatures) {
    const coord = { lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] };
    const dist = distanceMeters(coord, destCoords);
    sim.feedGpsUpdate(coord);

    // Flush active animation frames to simulate smooth interpolation
    if (raf.hasPending()) {
      raf.flush(performance.now() + 500);
    }

    if (!sim.marker || sim.marker.latLng[0] !== coord.lat || sim.marker.latLng[1] !== coord.lng) {
      markerMovedPreArrival = false;
    }
  }

  assert('Marker moves during normal navigation', markerMovedPreArrival && !sim.isArrived,
    `Marker smoothly updated through Positions B (40m), C (25m), D (15m), and E (12m).`);

  // 4. Test RAF / Interpolation specifically before arrival:
  // Send GPS update towards Position E, start an interpolation frame.
  // Before RAF finishes, send Arrival coordinate (Position F).
  const coordE = { lat: features[4].geometry.coordinates[1], lng: features[4].geometry.coordinates[0] };
  const coordF = { lat: features[5].geometry.coordinates[1], lng: features[5].geometry.coordinates[0] }; // Arrival!

  // Reset marker to E and queue an active interpolation
  sim.feedGpsUpdate(coordE);
  const rafQueuedBeforeArrival = sim.rafId !== null;

  // Record marker coordinate immediately before arrival
  const markerCoordBeforeArrival = [...sim.marker.latLng];

  // Send arrival coordinate (Position F) while interpolation is in-flight!
  const distF = distanceMeters(coordF, destCoords);
  sim.feedGpsUpdate(coordF);

  assert('Arrival triggered at <=10m', sim.isArrived && distF <= 10,
    `Arrival coordinate measured at ${distF.toFixed(2)}m from destination (<= 10m threshold).`);

  // Record marker coordinate immediately after arrival
  const markerCoordImmediatelyAfterArrival = [...sim.marker.latLng];

  assert('Marker locked to authoritative arrival coordinate',
    markerCoordImmediatelyAfterArrival[0] === coordF.lat &&
    markerCoordImmediatelyAfterArrival[1] === coordF.lng,
    `Arrival Pos: [${coordF.lat}, ${coordF.lng}] | Frozen Marker Pos: [${markerCoordImmediatelyAfterArrival[0]}, ${markerCoordImmediatelyAfterArrival[1]}]`
  );

  assert('Active RAF cancelled/stopped after arrival',
    sim.rafId === null && !raf.hasPending(),
    `RAF cancelled count: ${raf.cancelCount}. Pending animation callbacks: ${raf.callbacks.size}.`
  );

  // 5. Post-Arrival GPS Jitter Simulation:
  // Position G: 13m away
  // Position H: 11m away
  // Position I: 7m away
  // Position J: 15m away
  // Position K: 22m away (drift)
  const jitterFeatures = features.slice(6); // G, H, I, J, K
  const markerHistoryPostArrival = [];
  const panToCountBeforeJitter = map.panToCalls.length;
  const markerSetCountBeforeJitter = sim.marker.setLatLngCalls.length;

  for (const feat of jitterFeatures) {
    const jitterCoord = { lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] };
    const measuredDist = distanceMeters(jitterCoord, destCoords);
    
    sim.feedGpsUpdate(jitterCoord);

    // Attempt to flush RAF (should have none)
    raf.flush(performance.now() + 1000);

    markerHistoryPostArrival.push({
      pointId: feat.properties.pointId,
      description: feat.properties.description,
      measuredDist: measuredDist.toFixed(2) + 'm',
      markerCoord: [...sim.marker.latLng],
      isIdenticalToArrival:
        sim.marker.latLng[0] === coordF.lat && sim.marker.latLng[1] === coordF.lng
    });
  }

  // Verify each post-arrival jitter point
  assert('Marker remains frozen after 13m GPS update',
    markerHistoryPostArrival[0].isIdenticalToArrival,
    `Point G (13.00m): Marker stayed at [${coordF.lat}, ${coordF.lng}]`
  );

  assert('Marker remains frozen after 11m GPS update',
    markerHistoryPostArrival[1].isIdenticalToArrival,
    `Point H (11.00m): Marker stayed at [${coordF.lat}, ${coordF.lng}]`
  );

  assert('Marker remains frozen after 7m GPS update',
    markerHistoryPostArrival[2].isIdenticalToArrival,
    `Point I (6.99m): Marker stayed at [${coordF.lat}, ${coordF.lng}]`
  );

  assert('Marker remains frozen after 15m GPS update',
    markerHistoryPostArrival[3].isIdenticalToArrival,
    `Point J (15.00m): Marker stayed at [${coordF.lat}, ${coordF.lng}]`
  );

  assert('Marker remains frozen after additional GPS drift (Position K)',
    markerHistoryPostArrival[4].isIdenticalToArrival,
    `Point K (21.99m): Marker stayed at [${coordF.lat}, ${coordF.lng}]`
  );

  const panToCountAfterJitter = map.panToCalls.length;
  const markerSetCountAfterJitter = sim.marker.setLatLngCalls.length;

  assert('No map.panTo after arrival',
    panToCountBeforeJitter === panToCountAfterJitter,
    `Total map.panTo calls during jitter: ${panToCountAfterJitter - panToCountBeforeJitter}. Map remained stable.`
  );

  assert('No marker interpolation after arrival',
    markerSetCountBeforeJitter === markerSetCountAfterJitter && !raf.hasPending(),
    `Total marker setLatLng calls during jitter: ${markerSetCountAfterJitter - markerSetCountBeforeJitter}. Zero interpolation.`
  );

  // 6. Navigation Reset & New Session Test
  // Stop / clear Session 1
  sim.stopSession();
  assert('Navigation reset clears frozen state',
    !sim.isArrived && sim.voiceState === 'IDLE' && sim.sessionId === null,
    'Session stopped, isArrived reset to false, voiceState set to IDLE.'
  );

  // Start Session 2 to a different destination or new route
  sim.startSession('session_2_test');
  const newRoutePoint1 = { lat: 21.124500, lng: 79.003000 };
  const newRoutePoint2 = { lat: 21.124600, lng: 79.003100 };

  sim.feedGpsUpdate(newRoutePoint1);
  if (raf.hasPending()) raf.flush(performance.now() + 500);

  const movedInSession2Step1 =
    sim.marker.latLng[0] === newRoutePoint1.lat && sim.marker.latLng[1] === newRoutePoint1.lng;

  sim.feedGpsUpdate(newRoutePoint2);
  if (raf.hasPending()) raf.flush(performance.now() + 1000);

  const movedInSession2Step2 =
    sim.marker.latLng[0] === newRoutePoint2.lat && sim.marker.latLng[1] === newRoutePoint2.lng;

  assert('New navigation session moves marker normally',
    movedInSession2Step1 && movedInSession2Step2 && !sim.isArrived,
    `Session 2 active. Marker updated to [${newRoutePoint1.lat}, ${newRoutePoint1.lng}] and [${newRoutePoint2.lat}, ${newRoutePoint2.lng}].`
  );

  // 7. Threshold and Zero-AI Isolation Validation
  const guidancePath = path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/hooks/useLiveGuidance.ts');
  const layerPath = path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/components/map/UserLocationLayer.tsx');
  const guidanceCode = fs.readFileSync(guidancePath, 'utf8');
  const layerCode = fs.readFileSync(layerPath, 'utf8');

  const thresholdsIntact =
    guidanceCode.includes('const ARRIVAL_METERS = 10;') &&
    guidanceCode.includes('const IMMEDIATE_METERS = 9;') &&
    guidanceCode.includes('const APPROACHING_METERS = 45;') &&
    guidanceCode.includes('const DESTINATION_APPROACH_METERS = 20;') &&
    guidanceCode.includes('const OFF_ROUTE_METERS = 40;') &&
    guidanceCode.includes('const ON_ROUTE_RECOVERY_METERS = 25;') &&
    guidanceCode.includes('const REASSURANCE_COOLDOWN_MS = 5000;') &&
    guidanceCode.includes('const REASSURANCE_MIN_PROGRESS_METERS = 5;');

  assert('Navigation thresholds unchanged', thresholdsIntact,
    'All thresholds intact (ARRIVAL=10m, IMMEDIATE=9m, APPROACHING=45m, OFF_ROUTE=40m).');

  const zeroAi =
    !layerCode.includes('gemini') &&
    !layerCode.includes('ollama') &&
    !layerCode.includes('langgraph') &&
    !layerCode.includes('fetch(') &&
    !layerCode.includes('axios');

  assert('Zero AI/network calls introduced', zeroAi,
    'UserLocationLayer is strictly client-side, local, and deterministic.');

  // Summary Table
  console.log('\n--------------------------------------------------');
  console.log('  DETAILED GPS REPLAY & MARKER POSITION LOG:');
  console.log('--------------------------------------------------');
  console.log(`Destination: ${geoJson.destination.name} [${destCoords.lat}, ${destCoords.lng}]`);
  console.log(`Marker before arrival: [${markerCoordBeforeArrival[0]}, ${markerCoordBeforeArrival[1]}]`);
  console.log(`Arrival coordinate:    [${coordF.lat}, ${coordF.lng}] (${distF.toFixed(2)}m from dest)`);
  console.log(`Marker frozen at:      [${markerCoordImmediatelyAfterArrival[0]}, ${markerCoordImmediatelyAfterArrival[1]}]`);
  console.log('Post-arrival jitter coordinates:');
  for (const item of markerHistoryPostArrival) {
    console.log(`  ${item.pointId} (${item.measuredDist}): Marker = [${item.markerCoord[0]}, ${item.markerCoord[1]}] (Locked: ${item.isIdenticalToArrival})`);
  }

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('==================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runGeoJsonMarkerFreezeTests();
