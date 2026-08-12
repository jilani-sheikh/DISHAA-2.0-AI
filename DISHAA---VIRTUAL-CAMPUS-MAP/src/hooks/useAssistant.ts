import { useCallback, useRef, useState } from 'react';
import type { Coordinates, Place, RouteResponse } from '../types';
import { assistantApi } from '../services/api/assistantApi';

/**
 * Actions the DISHAA assistant can perform. These are the real, backend-backed
 * capabilities the interface exposes today and are wired to the existing campus
 * map/navigation flow. The AI agent calls the same backend surface.
 */
export interface AssistantActions {
  /** Search the real campus database and return matching places. */
  searchPlaces: (query: string) => Promise<Place[]>;
  /** Center + highlight a place on the map and open its details. */
  showPlace: (place: Place) => void;
  /** Start a real Valhalla walking route to the destination. */
  navigateTo: (place: Place) => Promise<void> | void;
  /** Resolve the user's live location and return nearby campus places. */
  findNearby: () => Promise<Place[]>;
  /** Provide current UI context so the agent can stay location-aware. */
  getContext?: () => {
    currentLocation?: Coordinates | null;
    currentPlace?: Place | null;
    destination?: Place | null;
    navigationActive?: boolean;
    route?: RouteResponse | null;
  };
}

export type AssistantMessageKind = 'text' | 'places';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  kind: AssistantMessageKind;
  places?: Place[];
}

export type QuickAction = 'find-nearby' | 'search-library' | 'navigate-hint';

const GREETING: AssistantMessage = {
  id: 'greeting',
  role: 'assistant',
  kind: 'text',
  text: 'Hi! I’m DISHAA. Where would you like to go? Ask about any building, facility or department on campus.',
};

let messageSequence = 0;
const nextId = () => {
  messageSequence += 1;
  return `msg-${Date.now()}-${messageSequence}`;
};

const makeMessage = (
  role: AssistantMessage['role'],
  text: string,
  extra: Partial<AssistantMessage> = {},
): AssistantMessage => ({ id: nextId(), role, kind: 'text', text, ...extra });

const NAVIGATE_PATTERN = /\b(navigate|route|directions?|take me|how (do|can) i (get|reach)|way to|walk to)\b/i;
const NEARBY_PATTERN = /\b(near( ?by)?|closest|nearest|around me|close to me)\b/i;

export function useAssistant(actions: AssistantActions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([GREETING]);
  const [isThinking, setIsThinking] = useState(false);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const push = useCallback((message: AssistantMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const resolveFallbackResponse = useCallback(async (query: string): Promise<AssistantMessage> => {
    const normalized = query.trim();
    const { searchPlaces, findNearby } = actionsRef.current;

    if (NEARBY_PATTERN.test(normalized)) {
      try {
        const nearby = await findNearby();
        if (nearby.length === 0) {
          return makeMessage('assistant', 'I could not find campus places near your current location. Try moving closer to campus or search by name.');
        }
        return makeMessage('assistant', `Here are the closest places to you right now (${nearby.length} found):`, {
          kind: 'places',
          places: nearby.slice(0, 5),
        });
      } catch {
        return makeMessage('assistant', 'I could not read your location. Please allow location access, then ask again.');
      }
    }

    const wantsRoute = NAVIGATE_PATTERN.test(normalized);
    const searchTerm = normalized
      .replace(NAVIGATE_PATTERN, ' ')
      .replace(/\b(where('s| is)?|the|a|an|please|to|find|show|me|on the map|is)\b/gi, ' ')
      .replace(/[?.!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || normalized;

    try {
      const results = await searchPlaces(searchTerm);
      if (results.length === 0) {
        return makeMessage('assistant', `I couldn’t find anything matching “${searchTerm}” in the campus database. Try another name or category.`);
      }
      const lead = wantsRoute
        ? `Here’s what I found for “${searchTerm}”. Pick one to start walking directions:`
        : `I found ${results.length === 1 ? 'this place' : `${results.length} places`} for “${searchTerm}”:`;
      return makeMessage('assistant', lead, { kind: 'places', places: results.slice(0, 5) });
    } catch {
      return makeMessage('assistant', 'The campus service is not responding right now. Please try again in a moment.');
    }
  }, []);

  const resolveResponse = useCallback(async (query: string): Promise<AssistantMessage> => {
    const normalized = query.trim();
    if (!normalized) {
      return makeMessage('assistant', 'Please type a question or destination for the campus guide.');
    }

    const context = actionsRef.current.getContext?.() || {};

    try {
      const response = await assistantApi.chat({
        message: normalized,
        currentLocation: context.currentLocation ?? null,
        currentPlace: context.currentPlace ?? null,
        destination: context.destination ?? null,
        navigationActive: Boolean(context.navigationActive),
        route: context.route ?? null,
      });

      const places = Array.isArray(response.places) ? response.places as Place[] : [];
      return makeMessage('assistant', response.response, {
        kind: places.length > 0 ? 'places' : 'text',
        places: places.slice(0, 5),
      });
    } catch {
      return resolveFallbackResponse(normalized);
    }
  }, [resolveFallbackResponse]);

  const send = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isThinking) return;

    push(makeMessage('user', text));
    setIsThinking(true);
    try {
      const response = await resolveResponse(text);
      push(response);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, push, resolveResponse]);

  const runQuickAction = useCallback((action: QuickAction) => {
    if (action === 'find-nearby') return send('Find something near me');
    if (action === 'search-library') return send('Where is the library?');
    push(makeMessage('assistant', 'Sure — tell me the destination. For example: “Navigate to the auditorium” or “Directions to Block B”.'));
    return undefined;
  }, [push, send]);

  const showPlaceFromChat = useCallback((place: Place) => {
    actionsRef.current.showPlace(place);
    push(makeMessage('assistant', `Showing ${place.name} on the map.`));
  }, [push]);

  const navigateFromChat = useCallback(async (place: Place) => {
    push(makeMessage('assistant', `Starting walking directions to ${place.name}…`));
    await actionsRef.current.navigateTo(place);
  }, [push]);

  return { messages, isThinking, send, runQuickAction, showPlaceFromChat, navigateFromChat };
}
