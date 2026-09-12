const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { buildContextSnapshot, findNearbyPlaces, getNavigationRoute, searchCampusPlaces, isPointInsideCampus } = require('../tools/campusTools');
const { generateText, generateTextStream } = require('../../services/ai/aiProvider');

const isNavigationRequest = (message) => /\b(navigate|route|directions?|take me|walk to|go to|get to|how do i get|how can i get|start navigation|stop navigation|change destination)\b/i.test(message);
const isNearbyRequest = (message) => /\b(near me|nearest|closest|around me|close to me|what's near me|what is near me)\b/i.test(message);
const isWhereQuestion = (message) => /\b(where|which building|what is|who is|find)\b/i.test(message);
const isGreeting = (message) => /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste)[\s!.?]*$/i.test(String(message || '').trim());

// In-navigation context question patterns
const isWhereGoingQuestion = (message) => /\b(where (am i|are we) (going|heading)|what('s| is) (my|our) destination|where to)\b/i.test(message);
const isNextTurnQuestion = (message) => /\b(what('s| is) (my|the) next turn|next turn|which way (to|do i) turn|next step)\b/i.test(message);
const isHowFarQuestion = (message) => /\b(how far|remaining distance|distance (left|remaining)|how much (distance|time) is left|how long (to|until))\b/i.test(message);
const isOffRouteQuestion = (message) => /\b(am i on (the )?(right|correct) (path|track|route)|did i miss (the|a) turn|am i off route|wrong way)\b/i.test(message);

const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => [],
  }),
  message: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => '',
  }),
  currentLocation: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
  currentPlace: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
  destination: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
  navigationActive: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => false,
  }),
  navigationContext: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
  route: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
  intent: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => 'general',
  }),
  context: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
  results: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => [],
  }),
  response: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => '',
  }),
  action: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => 'information',
  }),
  actionDetails: Annotation({
    reducer: (existing, update) => (update ?? existing),
    default: () => null,
  }),
});

const extractOriginAndDestination = (message) => {
  const normalized = String(message || '').trim();

  // Pattern 1: "directions from [Origin] to [Destination]"
  const patternFromTo = /\b(?:directions?|route|navigate|take me|walk|way)?\s*(?:from|starting at|start from)\s+(.+?)\s+(?:to|towards|ending at)\s+(.+)/i;
  const matchFromTo = normalized.match(patternFromTo);
  if (matchFromTo) {
    return { originQuery: matchFromTo[1].trim(), destinationQuery: matchFromTo[2].trim() };
  }

  // Pattern 2: "route between [Origin] and [Destination]"
  const patternBetween = /\b(?:directions?|route|navigate)\s+(?:between)\s+(.+?)\s+(?:and)\s+(.+)/i;
  const matchBetween = normalized.match(patternBetween);
  if (matchBetween) {
    return { originQuery: matchBetween[1].trim(), destinationQuery: matchBetween[2].trim() };
  }

  // Pattern 3: "how to get to [Destination] from [Origin]"
  const patternToFrom = /\b(?:how to get|how do i get|how can i get)\s+to\s+(.+?)\s+from\s+(.+)/i;
  const matchToFrom = normalized.match(patternToFrom);
  if (matchToFrom) {
    return { originQuery: matchToFrom[2].trim(), destinationQuery: matchToFrom[1].trim() };
  }

  return null;
};

const buildSearchQuery = (message) => {
  const normalized = String(message || '').trim();
  if (!normalized) return '';

  let cleaned = normalized
    .replace(/\b(where is|where's|find|show|me|the|a|an|please|to|from|current location|near me|take me|navigate|go to|how do i get|how can i get|walk to|route to|directions to)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return normalized;
  return cleaned;
};

const buildCompactNavPrompt = (userMessage, navCtx) => {
  const parts = [];
  if (navCtx.destination?.name) parts.push(`- Destination: ${navCtx.destination.name}`);
  if (navCtx.origin?.name) parts.push(`- Origin: ${navCtx.origin.name}`);
  if (navCtx.remainingDistance != null) parts.push(`- Remaining Distance: ${navCtx.remainingDistance} meters`);
  if (navCtx.estimatedTime != null) parts.push(`- Estimated Time: ${navCtx.estimatedTime} minutes`);
  if (navCtx.currentManeuver?.instruction) {
    const dist = navCtx.currentManeuver.distance != null ? ` (in ${navCtx.currentManeuver.distance}m)` : '';
    parts.push(`- Current Maneuver: ${navCtx.currentManeuver.instruction}${dist}`);
  }
  if (navCtx.nextManeuver?.instruction) {
    const dist = navCtx.nextManeuver.distance != null ? ` (in ${navCtx.nextManeuver.distance}m)` : '';
    parts.push(`- Next Maneuver: ${navCtx.nextManeuver.instruction}${dist}`);
  }
  if (navCtx.nearbyLandmark?.name) {
    const dist = navCtx.nearbyLandmark.distance != null ? ` (${navCtx.nearbyLandmark.distance}m away)` : '';
    parts.push(`- Nearby Landmark: ${navCtx.nearbyLandmark.name}${dist}`);
  }
  parts.push(`- Navigation Status: ${navCtx.navigationStatus || 'navigating'}`);
  parts.push(`- Is Off Route: ${Boolean(navCtx.isOffRoute)}`);

  return `You are DISHAA, an AI campus navigation assistant.
You receive trusted navigation context generated by the navigation engine.
Use the provided navigation context as the source of truth.
Do not invent: routes, distances, landmarks, buildings, directions, arrival status.
Do not calculate route geometry yourself.
If navigationContext contains the required information, answer directly, concisely, and naturally (1-2 sentences).
If information is missing, state that you do not have that information.
Keep navigation answers concise and useful.

Trusted Navigation Context:
${parts.join('\n')}

User Question: ${userMessage}
Answer:`;
};

const buildFallbackResponse = (state) => {
  const { results = [], message = '', currentLocation, navigationActive, route, navigationContext } = state;
  const navCtx = navigationContext;

  if (navCtx && (navCtx.navigationStatus === 'navigating' || navCtx.navigationStatus === 'rerouting' || navCtx.navigationStatus === 'arrived' || navCtx.destination)) {
    if (isWhereGoingQuestion(message)) {
      return `You're heading to the ${navCtx.destination?.name || 'selected destination'}.`;
    }
    if (isNextTurnQuestion(message)) {
      if (navCtx.currentManeuver?.instruction) {
        const dist = navCtx.currentManeuver.distance != null ? ` in about ${navCtx.currentManeuver.distance} meters` : '';
        return `Your next turn is ${navCtx.currentManeuver.instruction.toLowerCase().startsWith('turn') ? navCtx.currentManeuver.instruction : `${navCtx.currentManeuver.instruction}`}${dist}.`;
      }
      return 'Continue straight along the marked path.';
    }
    if (isHowFarQuestion(message)) {
      if (navCtx.remainingDistance != null) {
        return `The ${navCtx.destination?.name || 'destination'} is about ${navCtx.remainingDistance} meters away.`;
      }
    }
    if (isOffRouteQuestion(message)) {
      if (navCtx.isOffRoute) {
        return 'You\'ve moved off the planned route. A new route is being calculated.';
      }
      return 'Yes, you\'re currently on the planned route.';
    }
    if (isNearbyRequest(message) && navCtx.nearbyLandmark) {
      return `You're about ${navCtx.nearbyLandmark.distance} meters from the ${navCtx.nearbyLandmark.name}.`;
    }
  }

  if (!results.length) {
    if (isNavigationRequest(message) && currentLocation) {
      return 'I could not resolve the destination from the campus data, so I could not start navigation. Try a place name or choose a destination on the map.';
    }
    return 'I could not find a matching campus place in the current database. Please try another building, facility, or department name.';
  }

  const lead = results[0];
  if (isNavigationRequest(message) && currentLocation && !navigationActive) {
    return `I found ${lead.name}. If you want, I can start navigation from your current location to ${lead.name}.`;
  }

  if (route) {
    return `I found a route to ${lead.name}. The path is ready and the map updates with the walking directions.`;
  }

  return `I found ${lead.name} (${lead.category}). It is located on campus and is ready to view on the map.`;
};

const formatPlacesForPrompt = (places = []) => {
  if (!places.length) return 'No matching campus places found.';
  return places
    .slice(0, 4)
    .map((p, i) => `${i + 1}. ${p.name} (${p.category}${p.subcategory ? ` - ${p.subcategory}` : ''}): ${p.description || 'Campus location'}`)
    .join('\n');
};

const graph = new StateGraph(AgentState)
  .addNode('classifyIntent', async (state) => {
    const messageText = state.message || '';
    const hasActiveNav = Boolean(state.navigationContext && state.navigationContext.destination);
    
    const intent = (hasActiveNav && (isWhereGoingQuestion(messageText) || isNextTurnQuestion(messageText) || isHowFarQuestion(messageText) || isOffRouteQuestion(messageText)))
      ? 'nav_guidance'
      : isNavigationRequest(messageText)
        ? 'navigation'
        : isNearbyRequest(messageText)
          ? 'nearby'
          : isWhereQuestion(messageText)
            ? 'lookup'
            : 'general';

    return { intent };
  })
  .addNode('searchCampus', async (state) => {
    const messageText = state.message || '';
    const currentLocation = state.currentLocation;

    if (state.intent === 'nav_guidance') {
      return { results: [], action: 'information' };
    }

    // Check if user query explicitly specifies both origin and destination
    const points = extractOriginAndDestination(messageText);
    if (points && points.originQuery && points.destinationQuery) {
      const originClean = buildSearchQuery(points.originQuery);
      const destClean = buildSearchQuery(points.destinationQuery);

      const [originResults, destResults] = await Promise.all([
        searchCampusPlaces({ query: originClean || points.originQuery, limit: 1 }),
        searchCampusPlaces({ query: destClean || points.destinationQuery, limit: 1 }),
      ]);

      if (originResults.length > 0 && destResults.length > 0) {
        const originPlace = originResults[0];
        const destPlace = destResults[0];

        const route = await getNavigationRoute({
          start: { lat: originPlace.location.lat, lng: originPlace.location.lng },
          destination: { lat: destPlace.location.lat, lng: destPlace.location.lng },
        }).catch(() => null);

        return {
          intent: 'navigation',
          results: [destPlace, originPlace],
          route,
          action: 'START_NAVIGATION',
          actionDetails: {
            originId: originPlace.id,
            originName: originPlace.name,
            destinationId: destPlace.id,
            destinationName: destPlace.name,
            originPlace,
            destinationPlace: destPlace,
          },
          response: `I calculated the walking route from ${originPlace.name} to ${destPlace.name}. Directions are displayed on the map!`,
        };
      }
    }

    if (isNearbyRequest(messageText) && currentLocation) {
      const nearby = await findNearbyPlaces({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        radius: 500,
        limit: 5,
      });
      return { results: nearby, action: nearby.length ? 'information' : 'error' };
    }

    const searchQuery = buildSearchQuery(messageText);
    const nextResults = searchQuery ? await searchCampusPlaces({ query: searchQuery, limit: 5 }) : [];
    return { results: nextResults, action: nextResults.length ? 'information' : 'error' };
  })
  .addNode('routeContext', async (state) => {
    if (state.intent !== 'navigation' || state.route || !state.currentLocation) {
      return { route: state.route || null };
    }

    const destinationPlace = state.destination && state.destination.id ? state.destination : (state.results[0] || null);
    if (!destinationPlace) return { route: null };

    const destinationLat = destinationPlace.location?.lat ?? destinationPlace.lat;
    const destinationLng = destinationPlace.location?.lng ?? destinationPlace.lng;

    if (destinationLat == null || destinationLng == null) return { route: null };

    const nextRoute = await getNavigationRoute({
      start: state.currentLocation,
      destination: { lat: destinationLat, lng: destinationLng },
    }).catch(() => null);

    return {
      route: nextRoute,
      action: nextRoute ? 'action' : 'error',
    };
  })
  .addNode('generateResponse', async (state) => {
    if (state.response) {
      return { response: state.response };
    }

    const messageText = state.message || '';
    const results = state.results || [];
    const navCtx = state.navigationContext;

    let prompt = '';
    if (navCtx && (navCtx.destination || navCtx.navigationStatus === 'navigating')) {
      prompt = buildCompactNavPrompt(messageText, navCtx);
    } else {
      const formattedResults = formatPlacesForPrompt(results);
      prompt = `You are DISHAA, an intelligent virtual campus assistant. Provide a clear, friendly, and concise response (max 2-3 sentences) using only this campus data:\n\nUser Question: ${messageText}\n\nCampus Places Found:\n${formattedResults}`;

      if (results.length === 0) {
        prompt += '\n\nNo exact campus place was matched. Politely tell the user to check the spelling or ask about campus buildings/departments.';
      }
    }

    try {
      const completion = await generateText(prompt, { skipCache: Boolean(navCtx) });
      return {
        response: completion.text,
        action: completion.text ? 'information' : 'error',
      };
    } catch (error) {
      return {
        response: buildFallbackResponse({ ...state, results, message: messageText }),
        action: 'error',
      };
    }
  })
  .addEdge(START, 'classifyIntent')
  .addConditionalEdges('classifyIntent', (state) => {
    return 'searchCampus';
  })
  .addConditionalEdges('searchCampus', (state) => {
    if (state.intent === 'navigation' && !state.route) {
      return 'routeContext';
    }
    return 'generateResponse';
  })
  .addEdge('routeContext', 'generateResponse')
  .addEdge('generateResponse', END);

const compiledGraph = graph.compile();

const processAssistantMessage = async (input = {}) => {
  const userMessage = String(input.message || '').trim();
  if (!userMessage) {
    throw new Error('A user message is required.');
  }

  // Fast path 1: Instant greeting
  if (isGreeting(userMessage) && !input.initialGreeting) {
    return {
      success: true,
      response: 'Hello! I’m DISHAA, your campus guide. Where would you like to go today?',
      intent: 'greeting',
      action: 'information',
      actionDetails: null,
      places: [],
      route: null,
      suggestions: ['Where is the library?', 'Find something near me', 'Directions to Block A', 'Where is the canteen?'],
      status: 'complete',
    };
  }

  // Fast path 2: Proactive location greeting
  if (input.initialGreeting && input.currentLocation) {
    try {
      const inside = await isPointInsideCampus({ lat: input.currentLocation.lat, lng: input.currentLocation.lng });
      const nearby = await findNearbyPlaces({
        lat: input.currentLocation.lat,
        lng: input.currentLocation.lng,
        radius: 100,
        limit: 3,
      });

      const nearestName = nearby.length > 0 ? nearby[0].name : 'the campus area';
      const greetingResponse = inside
        ? `📍 Welcome to campus! You are near ${nearestName}. Where would you like to go?`
        : `📍 Welcome to DISHAA! You are currently near ${nearestName}. Explore campus places or choose a destination to navigate.`;

      return {
        success: true,
        response: greetingResponse,
        intent: 'greeting',
        action: inside ? 'PROACTIVE_GREETING' : 'OUTSIDE_CAMPUS',
        actionDetails: null,
        places: nearby,
        route: null,
        suggestions: ['Where is the library?', 'Find something near me', 'Directions to Block A'],
        status: 'complete',
      };
    } catch (_) {}
  }

  // Fast path 3: Deterministic campus boundary check for navigation
  if (isNavigationRequest(userMessage) && input.currentLocation) {
    try {
      const inside = await isPointInsideCampus({ lat: input.currentLocation.lat, lng: input.currentLocation.lng });
      if (!inside) {
        return {
          success: true,
          response: 'You are currently outside the campus boundary. Please enter the campus to use DISHAA walking navigation.',
          intent: 'navigation',
          action: 'OUTSIDE_CAMPUS',
          actionDetails: null,
          places: [],
          route: null,
          status: 'outside_campus',
        };
      }
    } catch (_) {}
  }

  const state = {
    message: userMessage,
    currentLocation: input.currentLocation || null,
    currentPlace: input.currentPlace || null,
    destination: input.destination || null,
    navigationActive: Boolean(input.navigationActive),
    navigationContext: input.navigationContext || null,
    route: input.route || null,
    messages: [{ role: 'user', content: userMessage }],
  };

  const result = await compiledGraph.invoke(state);
  const finalText = result.response || buildFallbackResponse(result);

  let structuredAction = result.action || 'information';
  let actionDetails = result.actionDetails || null;

  try {
    const intent = result.intent || state.intent || 'general';
    const hasDestinationCandidate = Array.isArray(result.results) && result.results.length > 0;
    const candidate = hasDestinationCandidate ? result.results[0] : null;
    const hasCurrentLocation = Boolean(state.currentLocation || result.currentLocation);

    if (result.actionDetails && (result.actionDetails.originPlace || result.actionDetails.originId)) {
      structuredAction = 'START_NAVIGATION';
      actionDetails = result.actionDetails;
    } else if (intent === 'navigation' && hasDestinationCandidate && hasCurrentLocation) {
      structuredAction = 'START_NAVIGATION';
      actionDetails = {
        destinationId: candidate.id,
        destinationName: candidate.name,
      };
    }
  } catch (_) {}

  return {
    success: true,
    response: finalText,
    intent: result.intent || 'general',
    action: structuredAction,
    actionDetails,
    places: Array.isArray(result.results) ? result.results.slice(0, 5) : [],
    route: result.route || null,
    status: 'complete',
  };
};

/**
 * Stream-enabled assistant message processing.
 * Dispatches metadata first, then streams LLM text chunks via onChunk.
 */
const processAssistantMessageStream = async (input = {}, onChunk) => {
  const userMessage = String(input.message || '').trim();
  if (!userMessage) throw new Error('A user message is required.');

  // Check if handled by fast path
  if (isGreeting(userMessage) || (input.initialGreeting && input.currentLocation)) {
    const staticResult = await processAssistantMessage(input);
    onChunk(staticResult.response);
    return staticResult;
  }

  const navCtx = input.navigationContext;
  const isNavGuidance = Boolean(navCtx && navCtx.destination && (
    isWhereGoingQuestion(userMessage) ||
    isNextTurnQuestion(userMessage) ||
    isHowFarQuestion(userMessage) ||
    isOffRouteQuestion(userMessage) ||
    (isNearbyRequest(userMessage) && navCtx.nearbyLandmark)
  ));

  let prompt = '';
  let results = [];
  let classified = 'general';

  if (isNavGuidance) {
    classified = 'nav_guidance';
    prompt = buildCompactNavPrompt(userMessage, navCtx);
  } else {
    classified = isNavigationRequest(userMessage) ? 'navigation' : isNearbyRequest(userMessage) ? 'nearby' : isWhereQuestion(userMessage) ? 'lookup' : 'general';
    const searchQuery = buildSearchQuery(userMessage);
    if (isNearbyRequest(userMessage) && input.currentLocation) {
      results = await findNearbyPlaces({ lat: input.currentLocation.lat, lng: input.currentLocation.lng, radius: 500, limit: 5 });
    } else if (searchQuery) {
      results = await searchCampusPlaces({ query: searchQuery, limit: 5 });
    }

    const formattedResults = formatPlacesForPrompt(results);
    prompt = `You are DISHAA, an intelligent virtual campus assistant. Provide a clear, friendly, and concise response (max 2-3 sentences) using only this campus data:\n\nUser Question: ${userMessage}\n\nCampus Places Found:\n${formattedResults}`;
  }

  let streamedText = '';
  try {
    const res = await generateTextStream(
      prompt,
      (chunk) => {
        streamedText += chunk;
        onChunk(chunk);
      },
      { skipCache: Boolean(navCtx) }
    );
    streamedText = res.text || streamedText;
  } catch (err) {
    const fallback = buildFallbackResponse({ results, message: userMessage, currentLocation: input.currentLocation, navigationContext: navCtx });
    onChunk(fallback);
    streamedText = fallback;
  }

  let structuredAction = 'information';
  let actionDetails = null;
  if (classified === 'navigation' && results.length > 0 && input.currentLocation) {
    structuredAction = 'START_NAVIGATION';
    actionDetails = { destinationId: results[0].id, destinationName: results[0].name };
  }

  return {
    success: true,
    response: streamedText,
    intent: classified,
    action: structuredAction,
    actionDetails,
    places: results.slice(0, 5),
    route: null,
    status: 'complete',
  };
};

module.exports = {
  processAssistantMessage,
  processAssistantMessageStream,
  buildFallbackResponse,
};

