import { API_URL } from '../config/env';
import { getAuthToken } from '../auth/tokenStore';

export interface HttpOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  parseJson?: boolean;
}

function buildUrl(path: string, params?: HttpOptions['params']) {
  const base = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!params) {
    return base;
  }
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    url.searchParams.append(key, String(value));
  });
  return url.toString();
}

export async function httpRequest<TResponse = unknown>(path: string, options: HttpOptions = {}): Promise<TResponse> {
  const { params, parseJson = true, headers, ...rest } = options;
  const token = await getAuthToken();
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    ...rest
  });

  if (!response.ok) {
    const errorPayload = await safeParse(response);
    const error = new Error(errorPayload?.message || `HTTP ${response.status}`);
    (error as any).status = response.status;
    (error as any).details = errorPayload;
    throw error;
  }

  if (!parseJson) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function safeParse(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export const http = {
  get: <T = unknown>(path: string, options?: HttpOptions) =>
    httpRequest<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, options?: HttpOptions) =>
    httpRequest<T>(path, { ...options, method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T = unknown>(path: string, body?: unknown, options?: HttpOptions) =>
    httpRequest<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T = unknown>(path: string, options?: HttpOptions) =>
    httpRequest<T>(path, { ...options, method: 'DELETE' })
};
