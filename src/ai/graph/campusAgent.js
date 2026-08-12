const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { buildContextSnapshot, findNearbyPlaces, getNavigationRoute, searchCampusPlaces } = require('../tools/campusTools');
const { generateText } = require('../../services/ollamaService');

const isNavigationRequest = (message) => /\b(navigate|route|directions?|take me|walk to|go to|get to|how do i get|how can i get|start navigation|stop navigation|change destination)\b/i.test(message);
const isNearbyRequest = (message) => /\b(near me|nearest|closest|around me|close to me)\b/i.test(message);
const isWhereQuestion = (message) => /\b(where|which building|what is|who is|find)\b/i.test(message);

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
});

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

const buildFallbackResponse = (state) => {
  const { results = [], message = '', currentLocation, navigationActive, route } = state;

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

  return `I found ${lead.name}. It is a ${lead.category} on campus and is ready to view on the map.`;
};

const graph = new StateGraph(AgentState)
  .addNode('classifyIntent', async (state) => {
    const messageText = state.message || '';
    const intent = isNavigationRequest(messageText)
      ? 'navigation'
      : isNearbyRequest(messageText)
        ? 'nearby'
        : isWhereQuestion(messageText)
          ? 'lookup'
          : 'general';

    return { intent, context: buildContextSnapshot(state) };
  })
  .addNode('searchCampus', async (state) => {
    const messageText = state.message || '';
    const context = state.context || buildContextSnapshot(state);

    if (isNearbyRequest(messageText) && context.currentLocation) {
      const nearby = await findNearbyPlaces({
        lat: context.currentLocation.lat,
        lng: context.currentLocation.lng,
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
    const { currentLocation, destination, route, results = [] } = state;
    const destinationPlace = destination && destination.id ? destination : (results[0] || null);

    if (!destinationPlace || !currentLocation) {
      return { route: route || null };
    }

    const destinationLat = destinationPlace.location?.lat ?? destinationPlace.lat;
    const destinationLng = destinationPlace.location?.lng ?? destinationPlace.lng;

    if (destinationLat == null || destinationLng == null) {
      return { route: route || null };
    }

    const nextRoute = await getNavigationRoute({
      start: currentLocation,
      destination: { lat: destinationLat, lng: destinationLng },
    }).catch(() => null);

    return {
      route: nextRoute,
      action: nextRoute ? 'action' : 'error',
    };
  })
  .addNode('generateResponse', async (state) => {
    const messageText = state.message || '';
    const context = state.context || buildContextSnapshot(state);
    const results = state.results || [];

    let prompt = `You are DISHAA, a helpful campus navigation assistant. Answer naturally and use only the campus data provided.\n\nUser: ${messageText}\n\nContext: ${JSON.stringify(context, null, 2)}\n\nResult candidates: ${JSON.stringify(results.slice(0, 5), null, 2)}`;

    if (results.length === 0) {
      prompt += '\n\nThe user may be asking for a place or route. If no campus match exists, respond politely and ask them to try a different place name.';
    }

    try {
      const completion = await generateText(prompt);
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
    const intent = state.intent || 'general';
    return intent === 'nearby' || intent === 'navigation' || intent === 'lookup' ? 'searchCampus' : 'searchCampus';
  })
  .addEdge('searchCampus', 'routeContext')
  .addEdge('routeContext', 'generateResponse')
  .addEdge('generateResponse', END);

const compiledGraph = graph.compile();

const processAssistantMessage = async (input = {}) => {
  const userMessage = String(input.message || '').trim();
  if (!userMessage) {
    throw new Error('A user message is required.');
  }

  const state = {
    message: userMessage,
    currentLocation: input.currentLocation || null,
    currentPlace: input.currentPlace || null,
    destination: input.destination || null,
    navigationActive: Boolean(input.navigationActive),
    route: input.route || null,
    context: buildContextSnapshot({
      currentLocation: input.currentLocation || null,
      currentPlace: input.currentPlace || null,
      destination: input.destination || null,
      navigationActive: Boolean(input.navigationActive),
      route: input.route || null,
    }),
    messages: [{ role: 'user', content: userMessage }],
  };

  const result = await compiledGraph.invoke(state);
  const finalText = result.response || buildFallbackResponse(result);

  return {
    success: true,
    response: finalText,
    intent: result.intent || 'general',
    action: result.action || 'information',
    places: Array.isArray(result.results) ? result.results.slice(0, 5) : [],
    route: result.route || null,
    status: 'complete',
  };
};

module.exports = {
  processAssistantMessage,
  buildFallbackResponse,
};
