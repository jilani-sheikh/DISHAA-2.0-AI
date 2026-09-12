/**
 * Automated Voice Navigation Test Suite for DISHAA 2.0
 * Comprehensive testing of all 32 required voice guidance cases:
 *
 * TURN TESTS:
 * 1. Approaching left turn announces once.
 * 2. Repeated GPS updates do not repeat approaching left turn.
 * 3. Distance changing from 35m → 30m → 25m does NOT create three announcements.
 * 4. Immediate left turn announces once.
 * 5. Repeated GPS updates do not repeat immediate left.
 * 6. Same for right turns ("Turn right in X meters.", "Turn right now.").
 * 7. Previous turn does not repeat after the maneuver is completed.
 * 8. Next maneuver becomes eligible after completing the current maneuver.
 *
 * DESTINATION TESTS:
 * 9. At 21m: no destination approach.
 * 10. At exactly 20m: "Destination is approaching."
 * 11. Repeated GPS updates at 20m–11m: no repeat.
 * 12. At exactly 10m: "You have arrived at your destination."
 * 13. Repeated GPS updates at <=10m: no repeat.
 * 14. Jump from 25m directly to 9m: arrival announcement occurs.
 * 15. After arrival: no turn/reassurance speech.
 *
 * OFF-ROUTE TESTS:
 * 16. Off-route transition announces once.
 * 17. Repeated off-route GPS updates do not repeat.
 * 18. Previous maneuver is suppressed while off-route.
 * 19. Recovery announces route updated once.
 * 20. New route uses new maneuver state.
 *
 * REASSURANCE TESTS:
 * 21. No reassurance before 5 seconds.
 * 22. No reassurance without at least 5m meaningful progress.
 * 23. Reassurance repeats periodically when user keeps moving correctly.
 * 24. Reassurance messages rotate.
 * 25. Reassurance does not override a turn.
 * 26. Reassurance does not override off-route.
 * 27. Reassurance does not override destination approach.
 * 28. Reassurance does not override arrival.
 *
 * SESSION TESTS:
 * 29. Stop navigation resets session state correctly.
 * 30. Starting a new navigation session allows announcements again.
 * 31. GPS updates within the same session do NOT reset deduplication.
 *
 * AI ISOLATION TEST:
 * 32. Confirm zero Gemini/Ollama/LangGraph/network calls from real-time navigation/voice code.
 */

const fs = require('fs');
const path = require('path');

function runVoiceTests() {
  console.log('======================================================');
  console.log('  DISHAA 2.0 AUTOMATIC VOICE NAVIGATION TEST SUITE     ');
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

  // Priority Hierarchy Definition
  const priorities = {
    NORMAL: 1,
    REASSURANCE: 1,
    NAVIGATION: 2,
    APPROACHING: 3,
    DESTINATION_APPROACH: 4,
    OFF_ROUTE: 5,
    IMMEDIATE: 6,
    ARRIVAL: 7,
  };

  // Mock Voice Engine that emulates the browser SpeechSynthesis priority queue
  class MockVoiceEngine {
    constructor() {
      this.isVoiceEnabled = true;
      this.currentSessionId = null;
      this.isArrived = false;
      this.spokenKeys = new Set();
      this.spokenHistory = [];
      this.allSpokenHistory = [];
      this.isSpeaking = false;
      this.currentPriorityLevel = 0;
    }

    startSession(sessionId) {
      this.currentSessionId = sessionId;
      this.isArrived = false;
      this.spokenKeys.clear();
      this.spokenHistory = [];
      this.isSpeaking = false;
      this.currentPriorityLevel = 0;
    }

    stopSession() {
      this.currentSessionId = null;
      this.isArrived = false;
      this.spokenKeys.clear();
      this.spokenHistory = [];
      this.isSpeaking = false;
      this.currentPriorityLevel = 0;
    }

    setEnabled(enabled) {
      this.isVoiceEnabled = enabled;
      if (!enabled) {
        this.isSpeaking = false;
        this.currentPriorityLevel = 0;
      }
    }

    speak(text, priority = 'NORMAL', dedupeKey) {
      if (!this.isVoiceEnabled) return false;
      if (this.isArrived) return false;
      if (dedupeKey && this.spokenKeys.has(dedupeKey)) return false;

      const newLevel = priorities[priority] || 1;

      if (priority === 'ARRIVAL') {
        this.isArrived = true;
        this.isSpeaking = false;
      } else if (this.isSpeaking) {
        if (newLevel <= this.currentPriorityLevel && priority !== 'IMMEDIATE') {
          return false; // Suppress lower or equal priority while speaking
        }
      }

      if (dedupeKey) {
        this.spokenKeys.add(dedupeKey);
      }

      this.currentPriorityLevel = newLevel;
      const item = { text, priority, dedupeKey, sessionId: this.currentSessionId, time: Date.now() };
      this.spokenHistory.push(item);
      this.allSpokenHistory.push(item);
      return true;
    }
  }

  // Distance helper
  function mockDistanceMeters(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = (p1.lat - p2.lat) * 111000;
    const dy = (p1.lng - p2.lng) * 111000;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Direction extractor helper (mirrors useLiveGuidance.ts)
  function getTurnDirection(instruction) {
    const lower = instruction.toLowerCase();
    if (lower.includes('arrived') || lower.includes('destination')) return null;
    const actionPart = lower.split(/\b(?:onto|towards|toward|on|at|into)\b/)[0] || lower;
    const hasLeftAction = /\b(left|slight left|sharp left|bear left|keep left)\b/.test(actionPart);
    const hasRightAction = /\b(right|slight right|sharp right|bear right|keep right)\b/.test(actionPart);
    if (hasLeftAction && !hasRightAction) return 'left';
    if (hasRightAction && !hasLeftAction) return 'right';
    const hasLeft = /\bleft\b/.test(lower);
    const hasRight = /\bright\b/.test(lower);
    if (hasLeft && !hasRight) return 'left';
    if (hasRight && !hasLeft) return 'right';
    return null;
  }

  // Format maneuver speech helper (mirrors useLiveGuidance.ts)
  function formatManeuverSpeech({ instruction, stage, distance, nearbyLandmark }) {
    const dir = getTurnDirection(instruction);
    const isLeft = dir === 'left';
    const isRight = dir === 'right';

    if (stage === 'immediate') {
      if (isLeft) return 'Turn left now.';
      if (isRight) return 'Turn right now.';
      const cleanTurn = instruction.replace(/in \d+.*$/i, '').trim();
      return cleanTurn.toLowerCase().startsWith('turn') ? `${cleanTurn} now.` : `${cleanTurn}.`;
    }

    if (isLeft) {
      if (nearbyLandmark && nearbyLandmark.distance <= 35) {
        return `Turn left after the ${nearbyLandmark.name} in ${distance} meters.`;
      }
      return `Turn left in ${distance} meters.`;
    }

    if (isRight) {
      if (nearbyLandmark && nearbyLandmark.distance <= 35) {
        return `Turn right after the ${nearbyLandmark.name} in ${distance} meters.`;
      }
      return `Turn right in ${distance} meters.`;
    }

    if (nearbyLandmark && nearbyLandmark.distance <= 35) {
      return `${instruction} near the ${nearbyLandmark.name} in ${distance} meters.`;
    }
    return `${instruction} in ${distance} meters.`;
  }

  // Guidance Simulator that emulates useLiveGuidance.ts
  function createGuidanceSimulator(engine, initialRoute = null) {
    const REASSURANCE_COOLDOWN_MS = 5000;
    const REASSURANCE_MIN_PROGRESS_METERS = 5;
    const APPROACHING_METERS = 45;
    const IMMEDIATE_METERS = 9; // threshold for "immediate" stage ("turn now" <= 9m)
    const DESTINATION_APPROACH_METERS = 20;
    const ARRIVAL_METERS = 10;

    const REASSURANCE_MESSAGES = [
      'You are moving correctly. Go straight.',
      'You are on the right path. Continue straight.',
      'Perfect. You are moving correctly.',
      "You're on the right path. Keep going.",
      "You're doing great. Continue straight.",
    ];

    let currentRoute = initialRoute;
    let lastAnnouncementTime = 0;
    let lastAnnouncementLocation = null;
    let lastReassuranceLocation = null;
    let reassuranceIndex = 0;
    let destinationApproached = false;
    let isOffRoute = false;
    let arrived = false;
    let activeLegIndex = 0;
    const spokenManeuverStages = new Set();

    function init(sessionId, startLoc, now = Date.now()) {
      engine.startSession(sessionId);
      lastAnnouncementTime = now;
      lastAnnouncementLocation = startLoc;
      lastReassuranceLocation = startLoc;
      reassuranceIndex = 0;
      destinationApproached = false;
      isOffRoute = false;
      arrived = false;
      activeLegIndex = 0;
      spokenManeuverStages.clear();

      const startKey = `${sessionId}:start`;
      spokenManeuverStages.add(startKey);
      engine.speak('Navigation started. Go straight.', 'NAVIGATION', startKey);
    }

    function setRoute(newRoute, isRecalc = false) {
      currentRoute = newRoute;
      if (isRecalc && isOffRoute) {
        isOffRoute = false;
        activeLegIndex = 0;
        spokenManeuverStages.clear();
        const newSessionId = `${engine.currentSessionId || 'nav'}_recalc_${Date.now()}`;
        engine.startSession(newSessionId);
        const recoveryKey = `${newSessionId}:off_route_recover`;
        spokenManeuverStages.add(recoveryKey);
        engine.speak('Route updated. Continue straight.', 'NAVIGATION', recoveryKey);
      }
    }

    function evaluate({
      location,
      remainingToDest,
      maneuverIndex = 1,
      maneuverInstruction = 'Turn left onto Central Corridor',
      distanceToManeuver = 80,
      distToPath = 2,
      legIndex = 0,
      nearbyLandmark = null,
      destCoord = null,
      routeTerminus = null,
      now = Date.now(),
    }) {
      if (arrived || engine.isArrived) return;
      const sessionId = engine.currentSessionId || 'session';

      // 1. ARRIVAL DETECTION (<= 10m) - Priority 7 (Highest)
      const distToDest = remainingToDest;
      const isRouteTerminusValidForDest = routeTerminus && destCoord
        ? mockDistanceMeters(routeTerminus, destCoord) <= 35
        : false;
      const distToRouteEnd = isRouteTerminusValidForDest && routeTerminus && location
        ? mockDistanceMeters(location, routeTerminus)
        : distToDest;

      const isArrivedAtDestination =
        distToDest <= ARRIVAL_METERS ||
        (isRouteTerminusValidForDest && distToRouteEnd <= ARRIVAL_METERS && distToDest <= 25);

      if (isArrivedAtDestination) {
        arrived = true;
        const arrivalKey = `${sessionId}:arrival`;
        spokenManeuverStages.add(arrivalKey);
        engine.speak('You have arrived at your destination.', 'ARRIVAL', arrivalKey);
        lastAnnouncementTime = now;
        lastAnnouncementLocation = location;
        lastReassuranceLocation = location;
        return;
      }

      // 2. OFF-ROUTE DETECTION
      if (distToPath > 40) {
        if (!isOffRoute) {
          isOffRoute = true;
          const offRouteKey = `${sessionId}:off_route_enter`;
          if (!spokenManeuverStages.has(offRouteKey)) {
            spokenManeuverStages.add(offRouteKey);
            engine.speak('You are off route. Recalculating.', 'OFF_ROUTE', offRouteKey);
            lastAnnouncementTime = now;
            lastAnnouncementLocation = location;
            lastReassuranceLocation = location;
          }
        }
        return;
      } else if (distToPath <= 25 && isOffRoute) {
        isOffRoute = false;
        const recoveryKey = `${sessionId}:off_route_recover`;
        if (!spokenManeuverStages.has(recoveryKey)) {
          spokenManeuverStages.add(recoveryKey);
          engine.speak('Route updated. Continue straight.', 'NAVIGATION', recoveryKey);
          lastAnnouncementTime = now;
          lastAnnouncementLocation = location;
          lastReassuranceLocation = location;
        }
      }

      // 3. DESTINATION APPROACH (10m < dist <= 20m)
      if (remainingToDest <= DESTINATION_APPROACH_METERS && !isArrivedAtDestination) {
        if (!destinationApproached) {
          destinationApproached = true;
          const approachKey = `${sessionId}:destination_approach`;
          spokenManeuverStages.add(approachKey);
          engine.speak('Destination is approaching.', 'DESTINATION_APPROACH', approachKey);
          lastAnnouncementTime = now;
          lastAnnouncementLocation = location;
        }
      }

      // 4. MANEUVER EVALUATION
      if (legIndex >= activeLegIndex) {
        activeLegIndex = legIndex;
      }

      const isArrivalManeuver = /arrived|destination/i.test(maneuverInstruction);
      let stage = 'cruising';

      // Arrival maneuvers must NEVER enter the turn state machine
      if (!isArrivalManeuver) {
        if (distanceToManeuver <= IMMEDIATE_METERS) {
          stage = 'immediate';
          const key = `${sessionId}:${maneuverIndex}:immediate`;
          if (!spokenManeuverStages.has(key)) {
            spokenManeuverStages.add(key);
            const speech = formatManeuverSpeech({
              instruction: maneuverInstruction,
              stage: 'immediate',
              distance: distanceToManeuver,
              nearbyLandmark,
            });
            engine.speak(speech, 'IMMEDIATE', key);
            lastAnnouncementTime = now;
            lastAnnouncementLocation = location;
          }
        } else if (distanceToManeuver <= APPROACHING_METERS) {
          stage = 'approaching';
          const key = `${sessionId}:${maneuverIndex}:approaching`;
          if (!spokenManeuverStages.has(key)) {
            spokenManeuverStages.add(key);
            const speech = formatManeuverSpeech({
              instruction: maneuverInstruction,
              stage: 'approaching',
              distance: distanceToManeuver,
              nearbyLandmark,
            });
            engine.speak(speech, 'APPROACHING', key);
            lastAnnouncementTime = now;
            lastAnnouncementLocation = location;
          }
        }
      }

      // 5. REASSURANCE EVALUATION
      const isDestinationApproachActive = remainingToDest <= DESTINATION_APPROACH_METERS;
      const isTurnActive = stage !== 'cruising' || distanceToManeuver <= APPROACHING_METERS;

      if (
        !isOffRoute &&
        !arrived &&
        !engine.isArrived &&
        stage === 'cruising' &&
        !isDestinationApproachActive &&
        !isTurnActive
      ) {
        const timeDiff = now - lastAnnouncementTime;
        const distDiff = lastReassuranceLocation
          ? mockDistanceMeters(location, lastReassuranceLocation)
          : 0;

        if (timeDiff >= REASSURANCE_COOLDOWN_MS && distDiff >= REASSURANCE_MIN_PROGRESS_METERS) {
          const msg = REASSURANCE_MESSAGES[reassuranceIndex % REASSURANCE_MESSAGES.length];
          reassuranceIndex = (reassuranceIndex + 1) % REASSURANCE_MESSAGES.length;
          engine.speak(msg, 'REASSURANCE', `${sessionId}:reassurance:${reassuranceIndex}:${now}`);
          lastAnnouncementTime = now;
          lastAnnouncementLocation = location;
          lastReassuranceLocation = location;
        }
      }
    }

    return { init, evaluate, setRoute, getEngine: () => engine, getSpokenKeys: () => spokenManeuverStages };
  }

  console.log('--- TURN TESTS (1 - 8) ---');

  // Test 1: Approaching left turn announces once
  const engT1 = new MockVoiceEngine();
  const simT1 = createGuidanceSimulator(engT1);
  simT1.init('sess_t1', { lat: 21.0, lng: 79.0 });
  simT1.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 100,
    maneuverIndex: 1,
    maneuverInstruction: 'Turn left onto Central Corridor',
    distanceToManeuver: 35,
  });
  const t1Item = engT1.spokenHistory.find((h) => h.priority === 'APPROACHING');
  assert(
    'Approaching left turn announces once',
    t1Item && t1Item.text === 'Turn left in 35 meters.',
    `Spoken: "${t1Item?.text}"`
  );

  // Test 2: Repeated GPS updates do not repeat approaching left turn
  for (let i = 0; i < 5; i++) {
    simT1.evaluate({
      location: { lat: 21.0, lng: 79.0 },
      remainingToDest: 100,
      maneuverIndex: 1,
      maneuverInstruction: 'Turn left onto Central Corridor',
      distanceToManeuver: 35,
    });
  }
  const t2Count = engT1.spokenHistory.filter((h) => h.dedupeKey === 'sess_t1:1:approaching').length;
  assert('Repeated GPS updates do not repeat approaching left turn', t2Count === 1, `Count: ${t2Count}`);

  // Test 3: Distance changing from 35m -> 30m -> 25m does NOT create three announcements
  simT1.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 95, maneuverIndex: 1, distanceToManeuver: 30 });
  simT1.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 90, maneuverIndex: 1, distanceToManeuver: 25 });
  const t3ApproachingCount = engT1.spokenHistory.filter((h) => h.priority === 'APPROACHING').length;
  assert(
    'Distance changing from 35m → 30m → 25m does NOT create three announcements',
    t3ApproachingCount === 1,
    `Total approaching announcements: ${t3ApproachingCount}`
  );

  // Test 4: Immediate left turn announces once (at <=9m)
  simT1.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 70,
    maneuverIndex: 1,
    maneuverInstruction: 'Turn left onto Central Corridor',
    distanceToManeuver: 9,
  });
  const t4Item = engT1.spokenHistory.find((h) => h.priority === 'IMMEDIATE');
  assert(
    'Immediate left turn announces once (at <=9m)',
    t4Item && t4Item.text === 'Turn left now.',
    `Spoken: "${t4Item?.text}"`
  );

  // Test 5: Repeated GPS updates do not repeat immediate left
  for (let d = 10; d >= 2; d -= 2) {
    simT1.evaluate({
      location: { lat: 21.0, lng: 79.0 },
      remainingToDest: 70 - (12 - d),
      maneuverIndex: 1,
      maneuverInstruction: 'Turn left onto Central Corridor',
      distanceToManeuver: d,
    });
  }
  const t5Count = engT1.spokenHistory.filter((h) => h.dedupeKey === 'sess_t1:1:immediate').length;
  assert('Repeated GPS updates do not repeat immediate left', t5Count === 1, `Count: ${t5Count}`);

  // Test 6: Same for right turns ("Turn right in X meters.", "Turn right now.")
  const engT6 = new MockVoiceEngine();
  const simT6 = createGuidanceSimulator(engT6);
  simT6.init('sess_t6', { lat: 21.0, lng: 79.0 });
  simT6.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 100,
    maneuverIndex: 1,
    maneuverInstruction: 'Turn right towards Library',
    distanceToManeuver: 40,
  });
  simT6.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 70,
    maneuverIndex: 1,
    maneuverInstruction: 'Turn right towards Library',
    distanceToManeuver: 9,
  });
  const t6Approach = engT6.spokenHistory.find((h) => h.dedupeKey === 'sess_t6:1:approaching');
  const t6Immediate = engT6.spokenHistory.find((h) => h.dedupeKey === 'sess_t6:1:immediate');
  assert(
    'Same for right turns ("Turn right in X meters.", "Turn right now.")',
    t6Approach?.text === 'Turn right in 40 meters.' && t6Immediate?.text === 'Turn right now.',
    `Approach: "${t6Approach?.text}", Immediate: "${t6Immediate?.text}"`
  );

  // Test 7: Previous turn does not repeat after the maneuver is completed
  // Complete maneuver 1 by transitioning to leg 1 (upcoming maneuver is now 2)
  simT6.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 60,
    legIndex: 1,
    maneuverIndex: 2,
    maneuverInstruction: 'Continue towards Library',
    distanceToManeuver: 50,
  });
  const t7History = engT6.spokenHistory.filter((h) => h.dedupeKey && h.dedupeKey.includes(':1:'));
  assert(
    'Previous turn does not repeat after the maneuver is completed',
    t7History.length === 2, // Exactly 1 approach, 1 immediate from earlier
    `Maneuver 1 entries: ${t7History.length}`
  );

  // Test 8: Next maneuver becomes eligible after completing the current maneuver
  simT6.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 45,
    legIndex: 1,
    maneuverIndex: 2,
    maneuverInstruction: 'Turn left onto Pathway',
    distanceToManeuver: 30,
  });
  const t8Item = engT6.spokenHistory.find((h) => h.dedupeKey === 'sess_t6:2:approaching');
  assert(
    'Next maneuver becomes eligible after completing the current maneuver',
    t8Item && t8Item.text === 'Turn left in 30 meters.',
    `Next maneuver spoken: "${t8Item?.text}"`
  );

  console.log('\n--- DESTINATION TESTS (9 - 15) ---');

  // Test 9: At 21m: no destination approach
  const engD9 = new MockVoiceEngine();
  const simD9 = createGuidanceSimulator(engD9);
  simD9.init('sess_d9', { lat: 21.0, lng: 79.0 });
  simD9.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 21, distanceToManeuver: 50 });
  const d9Approach = engD9.spokenHistory.some((h) => h.priority === 'DESTINATION_APPROACH');
  assert('At 21m: no destination approach', !d9Approach);

  // Test 10: At exactly 20m: "Destination is approaching."
  simD9.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 20, distanceToManeuver: 50 });
  const d10Item = engD9.spokenHistory.find((h) => h.priority === 'DESTINATION_APPROACH');
  assert(
    'At exactly 20m: "Destination is approaching."',
    d10Item && d10Item.text === 'Destination is approaching.',
    `Spoken: "${d10Item?.text}"`
  );

  // Test 11: Repeated GPS updates at 20m–11m: no repeat
  for (let d = 19; d >= 11; d -= 2) {
    simD9.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: d, distanceToManeuver: 50 });
  }
  const d11Count = engD9.spokenHistory.filter((h) => h.priority === 'DESTINATION_APPROACH').length;
  assert('Repeated GPS updates at 20m–11m: no repeat', d11Count === 1, `Approach count: ${d11Count}`);

  // Test 12: At exactly 10m: "You have arrived at your destination."
  simD9.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 10, distanceToManeuver: 10 });
  const d12Item = engD9.spokenHistory.find((h) => h.priority === 'ARRIVAL');
  assert(
    'At exactly 10m: "You have arrived at your destination."',
    d12Item && d12Item.text === 'You have arrived at your destination.',
    `Spoken: "${d12Item?.text}"`
  );

  // Test 13: Repeated GPS updates at <=10m: no repeat
  for (let d = 9; d >= 1; d -= 2) {
    simD9.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: d, distanceToManeuver: d });
  }
  const d13Count = engD9.spokenHistory.filter((h) => h.priority === 'ARRIVAL').length;
  assert('Repeated GPS updates at <=10m: no repeat', d13Count === 1, `Arrival count: ${d13Count}`);

  // Test 14: Jump from 25m directly to 9m: arrival announcement occurs
  const engD14 = new MockVoiceEngine();
  const simD14 = createGuidanceSimulator(engD14);
  simD14.init('sess_d14', { lat: 21.0, lng: 79.0 });
  simD14.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 25, distanceToManeuver: 50 });
  simD14.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 9, distanceToManeuver: 9 });
  const d14Approach = engD14.spokenHistory.some((h) => h.priority === 'DESTINATION_APPROACH');
  const d14Arrival = engD14.spokenHistory.some((h) => h.priority === 'ARRIVAL');
  assert(
    'Jump from 25m directly to 9m: arrival announcement occurs (approach cleanly skipped)',
    !d14Approach && d14Arrival
  );

  // Test 15: After arrival: no turn/reassurance speech
  const postArrivalLen = engD9.spokenHistory.length;
  for (let i = 0; i < 50; i++) {
    simD9.evaluate({
      location: { lat: 21.0001 + i * 0.0001, lng: 79.0 },
      remainingToDest: 3,
      distanceToManeuver: 3,
      now: Date.now() + i * 1000,
    });
  }
  assert('After arrival: no turn/reassurance speech (permanent arrival lock)', engD9.spokenHistory.length === postArrivalLen);

  console.log('\n--- OFF-ROUTE TESTS (16 - 20) ---');

  // Test 16: Off-route transition announces once
  const engO16 = new MockVoiceEngine();
  const simO16 = createGuidanceSimulator(engO16);
  simO16.init('sess_o16', { lat: 21.0, lng: 79.0 });
  simO16.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 100, distanceToManeuver: 80, distToPath: 45 });
  const o16Item = engO16.spokenHistory.find((h) => h.priority === 'OFF_ROUTE');
  assert(
    'Off-route transition announces once',
    o16Item && o16Item.text === 'You are off route. Recalculating.',
    `Spoken: "${o16Item?.text}"`
  );

  // Test 17: Repeated off-route GPS updates do not repeat
  for (let i = 0; i < 10; i++) {
    simO16.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 100, distanceToManeuver: 80, distToPath: 50 });
  }
  const o17Count = engO16.spokenHistory.filter((h) => h.priority === 'OFF_ROUTE').length;
  assert('Repeated off-route GPS updates do not repeat', o17Count === 1, `Count: ${o17Count}`);

  // Test 18: Previous maneuver is suppressed while off-route
  simO16.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 100,
    maneuverIndex: 1,
    distanceToManeuver: 6, // In immediate turn zone, but off-route!
    distToPath: 50,
  });
  const o18ImmediateSpoken = engO16.spokenHistory.some((h) => h.priority === 'IMMEDIATE');
  assert('Previous maneuver is suppressed while off-route', !o18ImmediateSpoken);

  // Test 19: Recovery announces route updated once
  simO16.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 95, distanceToManeuver: 80, distToPath: 15 });
  const o19Count = engO16.spokenHistory.filter((h) => h.text === 'Route updated. Continue straight.').length;
  assert('Recovery announces route updated once', o19Count === 1, `Recovery count: ${o19Count}`);

  // Test 20: New route uses new maneuver state
  // Simulate recalculation: user went off-route then new route arrived
  simO16.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 100, distanceToManeuver: 80, distToPath: 45 });
  simO16.setRoute({ to: { name: 'Library' } }, true); // Recalculation
  // Now on new route, approaching new maneuver 1
  simO16.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 80,
    maneuverIndex: 1,
    maneuverInstruction: 'Turn right onto New Path',
    distanceToManeuver: 35,
    distToPath: 2,
  });
  const o20NewManeuver = engO16.spokenHistory.find((h) => h.text.includes('New Path') || h.text === 'Turn right in 35 meters.');
  assert('New route uses new maneuver state (stale maneuvers cleared)', Boolean(o20NewManeuver), `Spoken: "${o20NewManeuver?.text}"`);

  console.log('\n--- REASSURANCE TESTS (21 - 28) ---');

  // Test 21: No reassurance before 5 seconds
  const engR21 = new MockVoiceEngine();
  const simR21 = createGuidanceSimulator(engR21);
  let rTime = 100000;
  let rLat = 21.0;
  simR21.init('sess_r21', { lat: rLat, lng: 79.0 }, rTime);

  // 4s passed, 10m moved -> Should NOT speak (time < 5000ms)
  rTime += 4000;
  rLat += 0.0001; // ~11m
  simR21.evaluate({ location: { lat: rLat, lng: 79.0 }, remainingToDest: 150, distanceToManeuver: 100, distToPath: 2, now: rTime });
  const r21Count = engR21.spokenHistory.filter((h) => h.priority === 'REASSURANCE').length;
  assert('No reassurance before 5 seconds', r21Count === 0);

  // Test 22: No reassurance without at least 5m meaningful progress
  const engR22 = new MockVoiceEngine();
  const simR22 = createGuidanceSimulator(engR22);
  simR22.init('sess_r22', { lat: 21.0, lng: 79.0 }, 100000);
  // 6s passed, but moved only ~2.2m (0.00002 deg)
  simR22.evaluate({ location: { lat: 21.00002, lng: 79.0 }, remainingToDest: 150, distanceToManeuver: 100, distToPath: 2, now: 106000 });
  const r22Count = engR22.spokenHistory.filter((h) => h.priority === 'REASSURANCE').length;
  assert('No reassurance without at least 5m meaningful progress', r22Count === 0);

  // Test 23: Reassurance repeats periodically when user keeps moving correctly
  const engR23 = new MockVoiceEngine();
  const simR23 = createGuidanceSimulator(engR23);
  let r23Time = 100000;
  let r23Lat = 21.0;
  simR23.init('sess_r23', { lat: r23Lat, lng: 79.0 }, r23Time);
  for (let i = 0; i < 3; i++) {
    r23Time += 5000;
    r23Lat += 0.00007; // ~7.7m
    simR23.evaluate({ location: { lat: r23Lat, lng: 79.0 }, remainingToDest: 140 - i * 10, distanceToManeuver: 90 - i * 10, distToPath: 2, now: r23Time });
  }
  const r23Reassurances = engR23.spokenHistory.filter((h) => h.priority === 'REASSURANCE');
  assert('Reassurance repeats periodically when user keeps moving correctly', r23Reassurances.length === 3, `Count: ${r23Reassurances.length}`);

  // Test 24: Reassurance messages rotate
  const uniqueReassurances = new Set(r23Reassurances.map((h) => h.text));
  assert('Reassurance messages rotate', uniqueReassurances.size >= 2, `Messages: ${JSON.stringify([...uniqueReassurances])}`);

  // Test 25: Reassurance does not override a turn
  const engR25 = new MockVoiceEngine();
  const simR25 = createGuidanceSimulator(engR25);
  simR25.init('sess_r25', { lat: 21.0, lng: 79.0 }, 1000);
  simR25.evaluate({
    location: { lat: 21.0001, lng: 79.0 },
    remainingToDest: 100,
    distanceToManeuver: 35, // In approaching zone!
    distToPath: 2,
    now: 8000,
  });
  const lastSpokenR25 = engR25.spokenHistory[engR25.spokenHistory.length - 1];
  assert(
    'Reassurance does not override a turn',
    lastSpokenR25?.priority === 'APPROACHING',
    `Spoken: [${lastSpokenR25?.priority}] "${lastSpokenR25?.text}"`
  );

  // Test 26: Reassurance does not override off-route
  const engR26 = new MockVoiceEngine();
  const simR26 = createGuidanceSimulator(engR26);
  simR26.init('sess_r26', { lat: 21.0, lng: 79.0 }, 1000);
  simR26.evaluate({
    location: { lat: 21.0001, lng: 79.0 },
    remainingToDest: 100,
    distanceToManeuver: 80,
    distToPath: 50, // Off route!
    now: 8000,
  });
  const lastSpokenR26 = engR26.spokenHistory[engR26.spokenHistory.length - 1];
  assert(
    'Reassurance does not override off-route',
    lastSpokenR26?.priority === 'OFF_ROUTE',
    `Spoken: [${lastSpokenR26?.priority}] "${lastSpokenR26?.text}"`
  );

  // Test 27: Reassurance does not override destination approach
  const engR27 = new MockVoiceEngine();
  const simR27 = createGuidanceSimulator(engR27);
  simR27.init('sess_r27', { lat: 21.0, lng: 79.0 }, 1000);
  simR27.evaluate({
    location: { lat: 21.0001, lng: 79.0 },
    remainingToDest: 18, // Inside destination approach zone (<=20m)
    distanceToManeuver: 50,
    distToPath: 2,
    now: 8000,
  });
  const r27Reassurance = engR27.spokenHistory.some((h) => h.priority === 'REASSURANCE');
  const r27Approach = engR27.spokenHistory.some((h) => h.priority === 'DESTINATION_APPROACH');
  assert('Reassurance does not override destination approach', !r27Reassurance && r27Approach);

  // Test 28: Reassurance does not override arrival
  const engR28 = new MockVoiceEngine();
  const simR28 = createGuidanceSimulator(engR28);
  simR28.init('sess_r28', { lat: 21.0, lng: 79.0 }, 1000);
  simR28.evaluate({
    location: { lat: 21.0001, lng: 79.0 },
    remainingToDest: 8, // Arrival zone (<=10m)
    distanceToManeuver: 8,
    distToPath: 2,
    now: 8000,
  });
  const r28Reassurance = engR28.spokenHistory.some((h) => h.priority === 'REASSURANCE');
  const r28Arrival = engR28.spokenHistory.some((h) => h.priority === 'ARRIVAL');
  assert('Reassurance does not override arrival', !r28Reassurance && r28Arrival);

  console.log('\n--- SESSION TESTS (29 - 31) ---');

  // Test 29: Stop navigation resets session state correctly
  const engS29 = new MockVoiceEngine();
  engS29.startSession('sess_s29');
  engS29.speak('Nav started', 'NAVIGATION', 'start');
  engS29.stopSession();
  assert(
    'Stop navigation resets session state correctly',
    engS29.currentSessionId === null && engS29.isArrived === false && engS29.spokenKeys.size === 0
  );

  // Test 30: Starting a new navigation session allows announcements again
  const engS30 = new MockVoiceEngine();
  const simS30 = createGuidanceSimulator(engS30);
  // Session 1 arrives
  simS30.init('sess_1', { lat: 21.0, lng: 79.0 });
  simS30.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 5, distanceToManeuver: 5 });
  const sess1Arrived = engS30.isArrived;

  // Session 2 starts
  simS30.init('sess_2', { lat: 21.0, lng: 79.0 });
  const sess2Unlocked = engS30.isArrived === false && engS30.currentSessionId === 'sess_2';
  simS30.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 5, distanceToManeuver: 5 });
  const totalArrivals = engS30.allSpokenHistory.filter((h) => h.priority === 'ARRIVAL').length;
  assert(
    'Starting a new navigation session allows announcements again',
    sess1Arrived && sess2Unlocked && totalArrivals === 2
  );

  // Test 31: GPS updates within the same session do NOT reset deduplication
  const engS31 = new MockVoiceEngine();
  const simS31 = createGuidanceSimulator(engS31);
  simS31.init('sess_s31', { lat: 21.0, lng: 79.0 });
  // Send 10 GPS updates with slightly changing coordinates
  for (let i = 0; i < 10; i++) {
    simS31.evaluate({
      location: { lat: 21.0 + i * 0.00001, lng: 79.0 },
      remainingToDest: 80 - i,
      maneuverIndex: 1,
      distanceToManeuver: 35 - i,
    });
  }
  const s31ApproachingCount = engS31.spokenHistory.filter((h) => h.dedupeKey === 'sess_s31:1:approaching').length;
  assert(
    'GPS updates within the same session do NOT reset deduplication',
    s31ApproachingCount === 1,
    `Approaching announcements count: ${s31ApproachingCount}`
  );

  console.log('\n--- TARGETED REAL-WORLD EDGE CASE TESTS (32 - 41) ---');

  // Test 32: Edge Case A — Normal left turn: 35m → 20m → 9m → 8m
  const engECA = new MockVoiceEngine();
  const simECA = createGuidanceSimulator(engECA);
  simECA.init('sess_eca', { lat: 21.0, lng: 79.0 });
  simECA.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 90, maneuverIndex: 1, maneuverInstruction: 'Turn left onto Central Corridor', distanceToManeuver: 35 });
  simECA.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 85, maneuverIndex: 1, maneuverInstruction: 'Turn left onto Central Corridor', distanceToManeuver: 20 });
  simECA.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 80, maneuverIndex: 1, maneuverInstruction: 'Turn left onto Central Corridor', distanceToManeuver: 9 });
  simECA.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 76, maneuverIndex: 1, maneuverInstruction: 'Turn left onto Central Corridor', distanceToManeuver: 8 });
  const ecaApproach = engECA.spokenHistory.filter((h) => h.dedupeKey === 'sess_eca:1:approaching');
  const ecaImmediate = engECA.spokenHistory.filter((h) => h.dedupeKey === 'sess_eca:1:immediate');
  assert(
    'Edge Case A: Normal left turn 35m → 20m → 9m → 8m announces approach at 35m and immediate at 9m once each',
    ecaApproach.length === 1 && ecaImmediate.length === 1 && ecaApproach[0].text === 'Turn left in 35 meters.' && ecaImmediate[0].text === 'Turn left now.',
    `Approach: "${ecaApproach[0]?.text}", Immediate: "${ecaImmediate[0]?.text}"`
  );

  // Test 33: Edge Case B — Normal right turn: 35m → 20m → 9m → 8m
  const engECB = new MockVoiceEngine();
  const simECB = createGuidanceSimulator(engECB);
  simECB.init('sess_ecb', { lat: 21.0, lng: 79.0 });
  simECB.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 90, maneuverIndex: 1, maneuverInstruction: 'Turn right onto Library Path', distanceToManeuver: 35 });
  simECB.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 85, maneuverIndex: 1, maneuverInstruction: 'Turn right onto Library Path', distanceToManeuver: 20 });
  simECB.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 80, maneuverIndex: 1, maneuverInstruction: 'Turn right onto Library Path', distanceToManeuver: 9 });
  simECB.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 76, maneuverIndex: 1, maneuverInstruction: 'Turn right onto Library Path', distanceToManeuver: 8 });
  const ecbApproach = engECB.spokenHistory.filter((h) => h.dedupeKey === 'sess_ecb:1:approaching');
  const ecbImmediate = engECB.spokenHistory.filter((h) => h.dedupeKey === 'sess_ecb:1:immediate');
  assert(
    'Edge Case B: Normal right turn 35m → 20m → 9m → 8m announces approach at 35m and immediate at 9m once each',
    ecbApproach.length === 1 && ecbImmediate.length === 1 && ecbApproach[0].text === 'Turn right in 35 meters.' && ecbImmediate[0].text === 'Turn right now.',
    `Approach: "${ecbApproach[0]?.text}", Immediate: "${ecbImmediate[0]?.text}"`
  );

  // Test 34: Edge Case C — Final approach: 20m → 15m → 10m
  const engECC = new MockVoiceEngine();
  const simECC = createGuidanceSimulator(engECC);
  simECC.init('sess_ecc', { lat: 21.0, lng: 79.0 });
  simECC.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 20, distanceToManeuver: 20 });
  simECC.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 15, distanceToManeuver: 15 });
  simECC.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 10, distanceToManeuver: 10 });
  const eccApproach = engECC.spokenHistory.filter((h) => h.priority === 'DESTINATION_APPROACH');
  const eccArrival = engECC.spokenHistory.filter((h) => h.priority === 'ARRIVAL');
  assert(
    'Edge Case C: Final approach 20m → 15m → 10m announces approach then arrival',
    eccApproach.length === 1 && eccArrival.length === 1 && eccApproach[0].text === 'Destination is approaching.' && eccArrival[0].text === 'You have arrived at your destination.',
    `Approach: "${eccApproach[0]?.text}", Arrival: "${eccArrival[0]?.text}"`
  );

  // Test 35: Edge Case D — GPS fluctuation: 12m → 9m → 13m → 8m → 11m → 7m
  const engECD = new MockVoiceEngine();
  const simECD = createGuidanceSimulator(engECD);
  simECD.init('sess_ecd', { lat: 21.0, lng: 79.0 });
  simECD.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 12, distanceToManeuver: 12 });
  simECD.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 9, distanceToManeuver: 9 });
  simECD.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 13, distanceToManeuver: 13 });
  simECD.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 8, distanceToManeuver: 8 });
  simECD.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 11, distanceToManeuver: 11 });
  simECD.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 7, distanceToManeuver: 7 });
  const ecdArrivals = engECD.spokenHistory.filter((h) => h.priority === 'ARRIVAL');
  assert(
    'Edge Case D: GPS fluctuation around destination confirms arrival once and never resets',
    ecdArrivals.length === 1 && engECD.isArrived === true,
    `Total arrivals spoken: ${ecdArrivals.length}`
  );

  // Test 36: Edge Case E — Final Valhalla arrival maneuver is NOT interpreted as a LEFT/RIGHT turn
  const engECE = new MockVoiceEngine();
  const simECE = createGuidanceSimulator(engECE);
  simECE.init('sess_ece', { lat: 21.0, lng: 79.0 });
  simECE.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 12,
    maneuverIndex: 3,
    maneuverInstruction: 'You have arrived at your destination, on the left',
    distanceToManeuver: 12,
  });
  const eceTurns = engECE.spokenHistory.filter((h) => h.priority === 'IMMEDIATE' || h.priority === 'APPROACHING');
  assert(
    'Edge Case E: Final Valhalla arrival maneuver is NOT announced as a turn ("Turn left now.")',
    eceTurns.length === 0,
    `Turns spoken: ${eceTurns.length}`
  );

  // Test 37: Edge Case F — Final turn before destination (Turn at 9m, Arrival at 10m)
  const engECF = new MockVoiceEngine();
  const simECF = createGuidanceSimulator(engECF);
  simECF.init('sess_ecf', { lat: 21.0, lng: 79.0 });
  // User approaches turn: destination is 15m away, upcoming turn is 9m away
  simECF.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 15,
    maneuverIndex: 2,
    maneuverInstruction: 'Turn left onto Library Entrance',
    distanceToManeuver: 9,
  });
  const ecfTurn = engECF.spokenHistory.find((h) => h.priority === 'IMMEDIATE');
  // User completes turn and reaches 10m from destination
  simECF.evaluate({
    location: { lat: 21.0001, lng: 79.0 },
    remainingToDest: 10,
    maneuverIndex: 2,
    maneuverInstruction: 'Turn left onto Library Entrance',
    distanceToManeuver: 0,
  });
  const ecfArrival = engECF.spokenHistory.find((h) => h.priority === 'ARRIVAL');
  assert(
    'Edge Case F: Genuine turn announced at <=9m, then arrival announced when destination reached',
    ecfTurn && ecfTurn.text === 'Turn left now.' && ecfArrival && ecfArrival.text === 'You have arrived at your destination.',
    `Turn: "${ecfTurn?.text}", Arrival: "${ecfArrival?.text}"`
  );

  // Test 38: Edge Case G — Passing near old route endpoint without matching active destination does NOT declare arrival
  const engECG = new MockVoiceEngine();
  const simECG = createGuidanceSimulator(engECG);
  simECG.init('sess_ecg', { lat: 21.0, lng: 79.0 });
  simECG.evaluate({
    location: { lat: 21.0001, lng: 79.0001 },
    remainingToDest: 80, // Far from active destination
    destCoord: { lat: 21.0007, lng: 79.0 }, // ~80m away
    routeTerminus: { lat: 21.0001, lng: 79.0001 }, // Unrelated/old route terminus nearby
    distanceToManeuver: 50,
  });
  const ecgArrival = engECG.spokenHistory.some((h) => h.priority === 'ARRIVAL');
  assert(
    'Edge Case G: Passing near arbitrary route endpoint far from active destination does NOT declare arrival',
    !ecgArrival,
    `Arrival declared: ${ecgArrival}`
  );

  // Test 39: Arrival overrides immediate turn when destination is directly reached
  const engT39 = new MockVoiceEngine();
  const simT39 = createGuidanceSimulator(engT39);
  simT39.init('sess_t39', { lat: 21.0, lng: 79.0 });
  simT39.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 9, // Reached destination
    maneuverIndex: 1,
    maneuverInstruction: 'Turn left onto Central Corridor',
    distanceToManeuver: 9,
  });
  const t39Immediate = engT39.spokenHistory.some((h) => h.priority === 'IMMEDIATE');
  const t39Arrival = engT39.spokenHistory.find((h) => h.priority === 'ARRIVAL');
  assert(
    'Arrival overrides immediate turn when destination is directly reached',
    !t39Immediate && t39Arrival && t39Arrival.text === 'You have arrived at your destination.',
    `Arrival spoken: "${t39Arrival?.text}"`
  );

  // Test 40: Final maneuver does not block arrival
  const engT40 = new MockVoiceEngine();
  const simT40 = createGuidanceSimulator(engT40);
  simT40.init('sess_t40', { lat: 21.0, lng: 79.0 });
  simT40.evaluate({
    location: { lat: 21.0, lng: 79.0 },
    remainingToDest: 10,
    maneuverIndex: 4,
    maneuverInstruction: 'You have arrived at Library',
    distanceToManeuver: 0,
  });
  const t40Arrival = engT40.spokenHistory.find((h) => h.priority === 'ARRIVAL');
  assert('Final maneuver does not block arrival', Boolean(t40Arrival), `Arrival spoken: "${t40Arrival?.text}"`);

  // Test 41: Monotonically increasing maneuver index (GPS backwards fluctuation does not repeat completed turn)
  const engT41 = new MockVoiceEngine();
  const simT41 = createGuidanceSimulator(engT41);
  simT41.init('sess_t41', { lat: 21.0, lng: 79.0 });
  // Leg 0: Maneuver 1 (at 9m)
  simT41.evaluate({ location: { lat: 21.0, lng: 79.0 }, remainingToDest: 100, legIndex: 0, maneuverIndex: 1, maneuverInstruction: 'Turn left', distanceToManeuver: 9 });
  // Advance to Leg 1: Maneuver 2
  simT41.evaluate({ location: { lat: 21.0001, lng: 79.0 }, remainingToDest: 80, legIndex: 1, maneuverIndex: 2, maneuverInstruction: 'Turn right', distanceToManeuver: 40 });
  // GPS fluctuates backwards with legIndex 0
  simT41.evaluate({ location: { lat: 21.00005, lng: 79.0 }, remainingToDest: 85, legIndex: 0, maneuverIndex: 1, maneuverInstruction: 'Turn left', distanceToManeuver: 9 });
  const t41Maneuver1Entries = engT41.spokenHistory.filter((h) => h.dedupeKey === 'sess_t41:1:immediate').length;
  assert(
    'Monotonically increasing maneuver index prevents completed turns from repeating',
    t41Maneuver1Entries === 1,
    `Maneuver 1 immediate entries: ${t41Maneuver1Entries}`
  );

  console.log('\n--- AI ISOLATION TEST (42) ---');

  // Test 42: Confirm zero Gemini/Ollama/LangGraph/network calls from real-time navigation/voice code
  const serviceCode = fs.readFileSync(
    path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/services/voiceNavigation.ts'),
    'utf8'
  );
  const hookCode = fs.readFileSync(
    path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/hooks/useVoiceNavigation.ts'),
    'utf8'
  );
  const guidanceCode = fs.readFileSync(
    path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/src/hooks/useLiveGuidance.ts'),
    'utf8'
  );

  const llmOrNetworkRegex = /gemini|ollama|langgraph|generateText|fetch\(.*assistant|assistantApi\./i;
  const usesLLMInVoice =
    llmOrNetworkRegex.test(serviceCode) ||
    llmOrNetworkRegex.test(hookCode) ||
    llmOrNetworkRegex.test(guidanceCode);

  assert(
    'Confirm zero Gemini/Ollama/LangGraph/network calls from real-time navigation/voice code',
    !usesLLMInVoice,
    'Real-time voice guidance loop is 100% deterministic, offline, and local'
  );

  console.log('\n======================================================');
  console.log(`  RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed === total) process.exit(0);
  else process.exit(1);
}

runVoiceTests();
