import { httpConfig } from '@/app/config/constants';
import { errorFromStatus, NetworkError, toAppError } from '@/shared/errors';
import type { Logger } from '@/shared/logger';

import { redactForLog } from './redact';

export type AccessTokenProvider = {
  token(): Promise<string | null>;
  invalidate(): Promise<string | null>;
};
export type SearchParams = Readonly<Record<string, string | number>>;
export type HttpClient = {
  get<T>(path: string, searchParams?: SearchParams): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete(path: string, body?: unknown): Promise<void>;
};

/** Auth endpoints that authenticate via body, not Bearer — must not trigger token refresh. */
const UNAUTHENTICATED_PATHS = new Set([
  'auth/sign-in',
  'auth/sign-up',
  'auth/refresh',
]);

function isUnauthenticatedPath(path: string): boolean {
  return UNAUTHENTICATED_PATHS.has(path);
}

function describe(status: number, data: unknown): { message: string; body: unknown } {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return { message, body: data };
  }
  if (typeof data === 'string' && data.length > 0) return { message: data, body: data };
  return { message: `Ошибка запроса (${status})`, body: data };
}
export function createHttpClient(options: {
  readonly baseUrl: string;
  readonly tokens: AccessTokenProvider;
  readonly logger: Logger;
}): HttpClient {
  const log = options.logger.child('http');
  const baseUrl = options.baseUrl.trim().replace(/\/+$/, '');
  if (baseUrl.length === 0) throw new Error('HTTP baseUrl must not be empty');
  const buildUrl = (path: string, searchParams?: SearchParams): string => {
    const normalizedPath = path.replace(/^\/+/, '');
    const url = `${baseUrl}/${normalizedPath}`;
    if (!searchParams) return url;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) params.set(key, String(value));
    return `${url}?${params.toString()}`;
  };
  const request = async <T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    init: { readonly json?: unknown; readonly searchParams?: SearchParams },
    retryOnUnauthorized = true,
  ): Promise<T> => {
    const normalizedPath = path.replace(/^\/+/, '');
    const url = buildUrl(normalizedPath, init.searchParams);
    const requestBody = init.json;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), httpConfig.timeoutMs);
    const skipAuth = isUnauthenticatedPath(normalizedPath);
    log.info('HTTP запрос', {
      method,
      url,
      path: normalizedPath,
      body: redactForLog(requestBody),
      searchParams: init.searchParams,
    });
    try {
      const token = skipAuth ? null : await options.tokens.token();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (requestBody !== undefined) headers['Content-Type'] = 'application/json';
      if (typeof token === 'string' && token.length > 0) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
        signal: controller.signal,
      } as RequestInit);
      const text = await response.text();
      const data = text.length > 0 ? parseResponseBody(text) : undefined;
      if (response.status === 204) return undefined as T;
      if (!response.ok) {
        const canRetryUnauthorized =
          response.status === 401 && retryOnUnauthorized && !skipAuth;
        if (canRetryUnauthorized) {
          const refreshed = await options.tokens.invalidate();
          if (refreshed !== null) return request<T>(method, path, init, false);
        }
        const { message, body } = describe(response.status, data ?? text);
        throw errorFromStatus(response.status, message, body);
      }
      return data as T;
    } catch (error) {
      log.error('HTTP запрос завершился ошибкой', error, {
        method,
        url,
        path,
        body: redactForLog(requestBody),
      });
      if (error instanceof Error && error.name === 'AbortError')
        throw new NetworkError('Превышено время ожидания сервера', null, { cause: error });
      if (error instanceof Error && error.message.includes('Network request failed'))
        throw new NetworkError('Нет соединения с сервером', null, { cause: error });
      throw toAppError(error);
    } finally {
      clearTimeout(timeout);
    }
  };
  return {
    get<T>(path: string, searchParams?: SearchParams): Promise<T> {
      return request<T>('get', path, searchParams === undefined ? {} : { searchParams });
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>('post', path, { json: body });
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return request<T>('patch', path, { json: body });
    },
    async delete(path: string, body?: unknown): Promise<void> {
      await request<void>('delete', path, { json: body });
    },
  };
}
function parseResponseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
