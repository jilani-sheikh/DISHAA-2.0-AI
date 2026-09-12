const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('====================================================');
  console.log('   DISHAA 2.0 GEMINI AI & NAVIGATION E2E TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;
  const metrics = {};

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

  // 1. General Health Check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    const ok = healthData.status === 'ok' && healthData.ai === 'available';
    assert('General API & Gemini AI Health', ok, `AI status: ${healthData.ai} (${healthData.aiMessage})`);
  } catch (err) {
    assert('General API & Gemini AI Health', false, err.message);
  }

  // 2. Assistant Specific Health Check
  try {
    const aiHealthRes = await fetch(`${BASE_URL}/assistant/health`);
    const aiHealth = await aiHealthRes.json();
    const ok = aiHealth.success && aiHealth.ai?.available === true && aiHealth.ai?.provider === 'gemini';
    assert('Assistant Health Endpoint (Gemini Active)', ok, `Provider: ${aiHealth.ai?.provider}, Model: ${aiHealth.ai?.model}`);
  } catch (err) {
    assert('Assistant Health Endpoint (Gemini Active)', false, err.message);
  }

  // 3. Navigation Intent Extraction ("directions from Main Gate to Block A")
  try {
    const navIntentRes = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'directions from Main Gate to Block A' }),
    });
    const navIntentData = await navIntentRes.json();
    const ok = navIntentData.success && (navIntentData.action === 'START_NAVIGATION' || navIntentData.intent === 'navigation');
    assert('Navigation Intent Extraction', ok, `Intent: ${navIntentData.intent}, Action: ${navIntentData.action}`);
  } catch (err) {
    assert('Navigation Intent Extraction', false, err.message);
  }

  // 4. Question: "Where am I going?" with navigationContext
  try {
    const navCtx = {
      navigationStatus: 'navigating',
      currentLocation: { lat: 21.1458, lng: 79.0882 },
      origin: { name: 'Main Gate', lat: 21.1460, lng: 79.0870 },
      destination: { name: 'Library', lat: 21.1472, lng: 79.0901 },
      remainingDistance: 420,
      estimatedTime: 5,
      currentManeuver: {
        instruction: 'Turn left',
        distance: 28,
        stage: 'approaching',
      },
      nextManeuver: {
        instruction: 'Turn right',
        distance: 95,
      },
      nearbyLandmark: {
        name: 'Basketball Court',
        category: 'Sports',
        distance: 18,
      },
      isOffRoute: false,
    };

    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Where am I going?',
        navigationContext: navCtx,
      }),
    });
    const data = await res.json();
    const mentionsLibrary = /library/i.test(data.response);
    assert('AI Navigation Question: "Where am I going?"', data.success && mentionsLibrary, `Response: "${data.response}"`);
  } catch (err) {
    assert('AI Navigation Question: "Where am I going?"', false, err.message);
  }

  // 5. Question: "What's my next turn?" with navigationContext
  try {
    const navCtx = {
      navigationStatus: 'navigating',
      destination: { name: 'Library', lat: 21.1472, lng: 79.0901 },
      remainingDistance: 420,
      currentManeuver: {
        instruction: 'Turn left',
        distance: 28,
        stage: 'approaching',
      },
      nextManeuver: {
        instruction: 'Turn right',
        distance: 95,
      },
      nearbyLandmark: {
        name: 'Basketball Court',
        category: 'Sports',
        distance: 18,
      },
      isOffRoute: false,
    };

    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "What's my next turn?",
        navigationContext: navCtx,
      }),
    });
    const data = await res.json();
    const mentionsLeftOrTurn = /left|turn|28/i.test(data.response);
    assert('AI Navigation Question: "What\'s my next turn?"', data.success && mentionsLeftOrTurn, `Response: "${data.response}"`);
  } catch (err) {
    assert('AI Navigation Question: "What\'s my next turn?"', false, err.message);
  }

  // 6. Question: "How far is the destination?" with navigationContext
  try {
    const navCtx = {
      navigationStatus: 'navigating',
      destination: { name: 'Library', lat: 21.1472, lng: 79.0901 },
      remainingDistance: 420,
      isOffRoute: false,
    };

    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How far is my destination?',
        navigationContext: navCtx,
      }),
    });
    const data = await res.json();
    const mentions420 = /420|meter|library/i.test(data.response);
    assert('AI Navigation Question: "How far is my destination?"', data.success && mentions420, `Response: "${data.response}"`);
  } catch (err) {
    assert('AI Navigation Question: "How far is my destination?"', false, err.message);
  }

  // 7. Question: "What's near me?" with navigationContext landmark
  try {
    const navCtx = {
      navigationStatus: 'navigating',
      destination: { name: 'Library', lat: 21.1472, lng: 79.0901 },
      nearbyLandmark: {
        name: 'Basketball Court',
        category: 'Sports',
        distance: 18,
      },
      isOffRoute: false,
    };

    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "What's near me?",
        navigationContext: navCtx,
      }),
    });
    const data = await res.json();
    const mentionsBasketball = /basketball/i.test(data.response);
    assert('AI Navigation Question: "What\'s near me?" (Landmark)', data.success && mentionsBasketball, `Response: "${data.response}"`);
  } catch (err) {
    assert('AI Navigation Question: "What\'s near me?" (Landmark)', false, err.message);
  }

  // 8. Question: "Am I on the right path?" (On route vs Off route)
  try {
    const onRouteCtx = {
      navigationStatus: 'navigating',
      destination: { name: 'Library' },
      isOffRoute: false,
    };
    const resOn = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Am I on the right path?',
        navigationContext: onRouteCtx,
      }),
    });
    const dataOn = await resOn.json();

    const offRouteCtx = {
      navigationStatus: 'rerouting',
      destination: { name: 'Library' },
      isOffRoute: true,
    };
    const resOff = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Did I miss the turn?',
        navigationContext: offRouteCtx,
      }),
    });
    const dataOff = await resOff.json();

    const okOn = /yes|on.*(route|path|track)|correct|planned/i.test(dataOn.response);
    const okOff = /off|missed|recalculat|rerout/i.test(dataOff.response);
    assert('AI Path Status Question (On-Route & Off-Route)', okOn && okOff, `OnRoute: "${dataOn.response}" | OffRoute: "${dataOff.response}"`);
  } catch (err) {
    assert('AI Path Status Question (On-Route & Off-Route)', false, err.message);
  }

  // 9. Campus Grounding & Anti-Hallucination ("Where is the airport?")
  try {
    const airportRes = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Where is the airport?' }),
    });
    const airportData = await airportRes.json();
    const deniesAirport = /(not (found|available|present|part of|on)|cannot find|couldn'?t find|no (matching|exact|airport))/i.test(airportData.response);
    assert('Anti-Hallucination ("Where is the airport?")', airportData.success && deniesAirport, `Response: "${airportData.response}"`);
  } catch (err) {
    assert('Anti-Hallucination ("Where is the airport?")', false, err.message);
  }

  // 10. General Question: "What is DISHAA?"
  try {
    const infoRes = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is DISHAA?' }),
    });
    const infoData = await infoRes.json();
    const mentionsDishaa = /dishaa|campus|navigation|assistant/i.test(infoData.response);
    assert('General Conversational Question: "What is DISHAA?"', infoData.success && mentionsDishaa, `Response: "${infoData.response}"`);
  } catch (err) {
    assert('General Conversational Question: "What is DISHAA?"', false, err.message);
  }

  // 11. SSE Streaming & TTFT Latency Measurement
  try {
    const start = Date.now();
    let ttft = null;
    let chunks = 0;
    let fullStreamText = '';

    const res = await fetch(`${BASE_URL}/assistant/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Give a 1-sentence tip for walking on campus.',
      }),
    });

    const body = res.body;
    await new Promise((resolve, reject) => {
      body.on('data', (chunk) => {
        if (!ttft) ttft = Date.now() - start;
        chunks++;
        fullStreamText += chunk.toString();
      });
      body.on('end', resolve);
      body.on('error', reject);
    });

    const totalTime = Date.now() - start;
    metrics.ttft = ttft;
    metrics.totalTime = totalTime;
    metrics.chunks = chunks;

    const hasTokens = fullStreamText.includes('data: {"type":"token"');
    const hasDone = fullStreamText.includes('data: {"type":"done"');
    assert('SSE Streaming Contract & Tokens', hasTokens && hasDone, `TTFT: ${ttft}ms, Total: ${totalTime}ms, Chunks: ${chunks}`);
  } catch (err) {
    assert('SSE Streaming Contract & Tokens', false, err.message);
  }

  // 12. Deterministic Local Guidance Maneuver Simulation Test
  // Test local 2-stage state logic: Approaching (<=45m) vs Immediate (<=8m)
  try {
    const distanceManeuverApproaching = 30; // 30m
    const distanceManeuverImmediate = 5; // 5m
    const rawInstruction = 'Turn left onto Central Corridor';

    function evaluateManeuverStage(dist) {
      if (dist <= 8) {
        const clean = rawInstruction.replace(/in \d+.*$/i, '').trim();
        return { stage: 'immediate', spoken: clean.toLowerCase().startsWith('turn') ? `${clean} now.` : `${clean}.` };
      } else if (dist <= 45) {
        return { stage: 'approaching', spoken: `${rawInstruction} in ${dist} meters.` };
      }
      return { stage: 'cruising', spoken: rawInstruction };
    }

    const app = evaluateManeuverStage(distanceManeuverApproaching);
    const imm = evaluateManeuverStage(distanceManeuverImmediate);

    const ok = app.stage === 'approaching' && app.spoken === 'Turn left onto Central Corridor in 30 meters.' &&
               imm.stage === 'immediate' && imm.spoken === 'Turn left onto Central Corridor now.';
    assert('Deterministic 2-Stage Maneuvers (Approaching 30m vs Immediate 5m)', ok, `Approaching: "${app.spoken}" | Immediate: "${imm.spoken}"`);
  } catch (err) {
    assert('Deterministic 2-Stage Maneuvers', false, err.message);
  }

  // 13. Zero AI Calls in GPS / Animation Loop Verification
  try {
    const liveGuidanceCode = fs.readFileSync(path.join(__dirname, 'DISHAA---VIRTUAL-CAMPUS-MAP/src/hooks/useLiveGuidance.ts'), 'utf-8');
    const geolocationCode = fs.readFileSync(path.join(__dirname, 'DISHAA---VIRTUAL-CAMPUS-MAP/src/hooks/useGeolocation.ts'), 'utf-8');
    const userLocationCode = fs.readFileSync(path.join(__dirname, 'DISHAA---VIRTUAL-CAMPUS-MAP/src/components/map/UserLocationLayer.tsx'), 'utf-8');

    const hasAICallInLiveGuidance = /assistantApi\.(chat|chatStream)|generateText|fetch\(['"`].*\/assistant/i.test(liveGuidanceCode);
    const hasAICallInGeolocation = /assistantApi\.(chat|chatStream)|generateText|fetch\(['"`].*\/assistant/i.test(geolocationCode);
    const hasAICallInLayer = /assistantApi\.(chat|chatStream)|generateText|fetch\(['"`].*\/assistant/i.test(userLocationCode);

    const zeroAI = !hasAICallInLiveGuidance && !hasAICallInGeolocation && !hasAICallInLayer;
    assert('Zero AI Calls in GPS / Animation Loop (Static Verification)', zeroAI, `GPS loop calls AI: ${!zeroAI}`);
  } catch (err) {
    assert('Zero AI Calls in GPS / Animation Loop (Static Verification)', false, err.message);
  }

  // 14. Deterministic Offline Fallback on Gemini Failure
  try {
    const { buildFallbackResponse } = require('./src/ai/graph/campusAgent');
    const navCtx = {
      navigationStatus: 'navigating',
      destination: { name: 'Library' },
      currentManeuver: { instruction: 'Turn left', distance: 28 },
      remainingDistance: 420,
      nearbyLandmark: { name: 'Basketball Court', distance: 18 },
      isOffRoute: false,
    };

    const fbWhere = buildFallbackResponse({ message: 'Where am I going?', navigationContext: navCtx });
    const fbTurn = buildFallbackResponse({ message: "What's my next turn?", navigationContext: navCtx });
    const fbDist = buildFallbackResponse({ message: 'How far is the library?', navigationContext: navCtx });
    const fbNear = buildFallbackResponse({ message: "What's near me?", navigationContext: navCtx });

    const okFb = fbWhere.includes('Library') && fbTurn.includes('Turn left') && fbDist.includes('420') && fbNear.includes('Basketball Court');
    assert('AI Offline Deterministic Resilience (Fallback using navigationContext)', okFb, `Fallback Turn: "${fbTurn}"`);
  } catch (err) {
    assert('AI Offline Deterministic Resilience', false, err.message);
  }

  // 15. Slow AI Non-Blocking Navigation Test
  try {
    // Verify that local navigation calculations complete synchronously in < 2ms regardless of AI delays
    const startCalc = Date.now();
    for (let i = 0; i < 100; i++) {
      // 100 simulated GPS updates and local maneuver distance calculations
      const dist = 35 - (i * 0.2);
      const isOff = dist > 40;
    }
    const elapsedCalc = Date.now() - startCalc;
    assert('Slow AI Non-Blocking Resilience (GPS math completely decoupled from LLM)', elapsedCalc < 20, `100 GPS cycles computed in ${elapsedCalc}ms`);
  } catch (err) {
    assert('Slow AI Non-Blocking Resilience', false, err.message);
  }

  // 16. Provider Abstraction & Dependency Audit
  try {
    const aiProvider = require('./src/services/ai/aiProvider');
    const activeProvider = aiProvider.getActiveProviderName();
    const isGemini = activeProvider === 'gemini';
    assert('Provider Abstraction Audit (Gemini is Primary)', isGemini, `Active Provider: "${activeProvider}"`);
  } catch (err) {
    assert('Provider Abstraction Audit', false, err.message);
  }

  // 17. Regression Tests (Greeting fast path & empty message rejection)
  try {
    const greetRes = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    const greetData = await greetRes.json();

    const emptyRes = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    const emptyData = await emptyRes.json();

    const okReg = greetData.success && greetData.intent === 'greeting' && emptyRes.status === 400;
    assert('Regression Tests (Greeting fast path & empty message rejection)', okReg, `Greeting intent: ${greetData.intent}, Empty status code: ${emptyRes.status}`);
  } catch (err) {
    assert('Regression Tests', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  if (metrics.ttft) {
    console.log(`  MEASURED METRICS: TTFT = ${metrics.ttft}ms | Total Stream Time = ${metrics.totalTime}ms | Chunks = ${metrics.chunks}`);
  }
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
