import type { Coordinates, Place, RouteResponse } from '../../types';
import { apiRequest } from './client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AssistantRequest {
  message: string;
  currentLocation?: Coordinates | null;
  currentPlace?: Place | null;
  destination?: Place | null;
  navigationActive?: boolean;
  route?: RouteResponse | null;
  initialGreeting?: boolean;
  navigationContext?: any;
}

export interface AssistantResponse {
  success: true;
  response: string;
  intent: string;
  action: string;
  actionDetails?: any;
  places?: Place[];
  route?: RouteResponse | null;
  suggestions?: string[];
  status?: string;
}

export const assistantApi = {
  chat: (payload: AssistantRequest) =>
    apiRequest<AssistantResponse>('/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }),

  chatStream: async (
    payload: AssistantRequest,
    onChunk: (token: string) => void,
  ): Promise<AssistantResponse> => {
    try {
      const response = await fetch(`${apiBaseUrl}/assistant/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        // Fall back to regular chat if SSE fails
        return assistantApi.chat(payload);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finalResult: AssistantResponse | null = null;
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'token' && event.content) {
              accumulatedText += event.content;
              onChunk(event.content);
            } else if (event.type === 'done' && event.result) {
              finalResult = event.result;
            }
          } catch (_) {}
        }
      }

      if (finalResult) {
        return finalResult;
      }

      return {
        success: true,
        response: accumulatedText,
        intent: 'general',
        action: 'information',
      };
    } catch (_) {
      // Graceful fallback to standard endpoint
      return assistantApi.chat(payload);
    }
  },
};

