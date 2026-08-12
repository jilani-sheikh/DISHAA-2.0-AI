import type { Coordinates, Place, RouteResponse } from '../../types';
import { apiRequest } from './client';

export interface AssistantRequest {
  message: string;
  currentLocation?: Coordinates | null;
  currentPlace?: Place | null;
  destination?: Place | null;
  navigationActive?: boolean;
  route?: RouteResponse | null;
}

export interface AssistantResponse {
  success: true;
  response: string;
  intent: string;
  action: string;
  places?: Place[];
  route?: RouteResponse | null;
  status?: string;
}

export const assistantApi = {
  chat: (payload: AssistantRequest) =>
    apiRequest<AssistantResponse>('/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }),
};
