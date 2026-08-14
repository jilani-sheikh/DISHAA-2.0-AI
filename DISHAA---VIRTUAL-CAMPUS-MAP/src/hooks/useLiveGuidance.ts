import { useEffect, useRef } from 'react';
import { decodePolyline } from '../utils/polyline';
import { distanceMeters } from '../utils/geo';
import { assistantApi } from '../services/api/assistantApi';
import type { RouteResponse, Coordinates } from '../types';

type GuidanceOptions = {
  route: RouteResponse | null;
  currentLocation: Coordinates | null;
  speak?: (text: string) => void;
  onInstruction?: (text: string | null, remainingMeters?: number | null) => void;
  onOffRoute?: () => void;
  onArrived?: () => void;
  recalcRoute?: () => void; // optional callback to trigger route recalculation
};

// Minimal live guidance hook. Keeps all logic deterministic except the final
// natural-language rendering which is delegated to the backend agent via
// assistantApi.chat. Calls are rate-limited and only triggered on meaningful
// navigation state changes (instruction index change, off-route, arrival).
export function useLiveGuidance(opts: GuidanceOptions) {
  const { route, currentLocation, speak, onInstruction, onOffRoute, onArrived, recalcRoute } = opts;
  const lastInstructionIndex = useRef<number | null>(null);
  const lastAICall = useRef<number>(0);
  const lastOffRoute = useRef(false);
  const arrived = useRef(false);

  const MIN_AI_INTERVAL_MS = 8000; // minimum between AI calls
  const OFF_ROUTE_METERS = 40; // threshold to consider off-route
  const ARRIVAL_METERS = 20; // consider arrived within 20m

  useEffect(() => {
    if (!route || !currentLocation) return;
    // Reset arrival state when new route starts
    arrived.current = false;
  }, [route]);

  useEffect(() => {
    if (!route || !currentLocation) return;

    const now = Date.now();

    // Decode polyline for simple proximity checks
    const path = decodePolyline(route?.route.encodedShape || null);

    // Compute distance to destination
    const dest = { lat: route.to.lat, lng: route.to.lng };
    const remainingMeters = Math.round(distanceMeters(currentLocation, dest));

    // Arrival detection
    if (!arrived.current && remainingMeters <= ARRIVAL_METERS) {
      arrived.current = true;
      // Inform UI
      onInstruction?.(`You have arrived at ${route.to.name}.`, 0);
      onArrived?.();
      // Speak
      if (speak) speak(`You have arrived at ${route.to.name}.`);
      return;
    }

    // Off-route detection: nearest point on decoded polyline (point set approximation)
    let minDist = Number.POSITIVE_INFINITY;
    for (const p of path) {
      const d = distanceMeters(currentLocation, p);
      if (d < minDist) minDist = d;
    }

    const isOffRoute = minDist > OFF_ROUTE_METERS;
    if (isOffRoute && !lastOffRoute.current) {
      lastOffRoute.current = true;
      onInstruction?.('You appear to be off the route. Recalculating.', remainingMeters);
      onOffRoute?.();
      // Speak and trigger recalculation (if provided)
      (async () => {
        if (speak) speak('You appear to be off the route. Recalculating.');
        // Ask the AI for a friendly phrase (optional) but keep it simple to save credits
        try {
          const resp = await assistantApi.chat({
            message: 'User is off-route. Provide a short guidance message.',
            currentLocation,
            currentPlace: null,
            destination: { lat: dest.lat, lng: dest.lng, name: route.to.name } as any,
            navigationActive: true,
            route,
          });
          if (resp && resp.response) {
            onInstruction?.(resp.response, remainingMeters);
            if (speak) speak(resp.response);
          }
        } catch (_) {
          // ignore assistant failure
        }
        // Recalculate route using provided callback if available
        try {
          recalcRoute?.();
        } catch (_) {}
      })();
      return;
    }

    // If back on route, clear off-route flag
    if (!isOffRoute) lastOffRoute.current = false;

    // Build cumulative-from-destination distances from the route instructions
    const instr = route.route.instructions || [];
    const cumFromDest: number[] = [];
    let acc = 0;
    for (let i = instr.length - 1; i >= 0; i--) {
      acc += (instr[i].distanceKm || 0) * 1000;
      cumFromDest[i] = Math.round(acc);
    }

    // Determine next instruction index: first where cumFromDest[i] >= remainingMeters
    let nextIndex = instr.length - 1;
    for (let i = 0; i < cumFromDest.length; i++) {
      if (cumFromDest[i] >= remainingMeters) {
        nextIndex = i;
        break;
      }
    }

    // Distance to that maneuver
    const distanceToManeuver = Math.max(0, cumFromDest[nextIndex] - remainingMeters);

    // Decide whether to request an AI-generated instruction
    const indexChanged = lastInstructionIndex.current !== nextIndex;
    const timeSinceAI = now - lastAICall.current;

    // Conditions: new instruction OR significant proximity (<50m) and cooldown passed
    if ((indexChanged || distanceToManeuver <= 50) && timeSinceAI > MIN_AI_INTERVAL_MS) {
      lastInstructionIndex.current = nextIndex;
      lastAICall.current = now;

      // Build a compact request to the assistant API. Keep the message short — the
      // backend LangGraph expects the message and structured context to generate
      // a natural-language guidance instruction.
      (async () => {
        try {
          const resp = await assistantApi.chat({
          message: `Navigate: provide a concise navigation instruction for the next maneuver.`,
            currentLocation,
            currentPlace: null,
            destination: { lat: dest.lat, lng: dest.lng, name: route.to.name } as any,
            navigationActive: true,
            route,
          });
          const text = (resp && resp.response) ? resp.response : instr[nextIndex]?.instruction || 'Continue straight.';
          onInstruction?.(text, Math.round(remainingMeters));
          if (speak) speak(text);
        } catch (e) {
          // fallback deterministic message using the raw instruction text
          const fallback = instr[nextIndex]?.instruction || 'Continue straight.';
          onInstruction?.(fallback, Math.round(remainingMeters));
          if (speak) speak(fallback);
        }
      })();
    } else {
      // Update UI-only guidance (no AI call)
      const uiText = instr[nextIndex]?.instruction || `Continue towards ${route.to.name}`;
      onInstruction?.(uiText, Math.round(remainingMeters));
    }
  }, [route, currentLocation]);
}
