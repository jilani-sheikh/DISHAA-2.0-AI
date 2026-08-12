const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

interface ApiFailure {
  success?: false;
  error?: string;
}

export class ApiError extends Error {
  constructor(message = 'The campus service could not complete that request.') {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...requestOptions } = options;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestOptions,
      headers: { Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('DISHAA cannot reach the campus service. Please try again shortly.');
  }

  const payload = (await response.json().catch(() => null)) as (T & ApiFailure) | null;
  if (!response.ok || !payload || payload.success === false) {
    throw new ApiError(payload?.error || 'The campus service could not complete that request.');
  }

  return payload as T;
}

export function buildQuery(parameters: Record<string, string | number | undefined>) {
  const searchParameters = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParameters.set(key, String(value));
  });
  const query = searchParameters.toString();
  return query ? `?${query}` : '';
}
