import Constants from 'expo-constants';

export type AppMode = 'development' | 'staging' | 'production';

type RawExtra = {
  readonly apiBaseUrl?: unknown;
  readonly websocketUrl?: unknown;
  readonly sentryDsn?: unknown;
  readonly posthogApiKey?: unknown;
  readonly posthogHost?: unknown;
  readonly mode?: unknown;
};

export type Env = {
  readonly mode: AppMode;
  readonly isDev: boolean;
  readonly isProduction: boolean;
  /**
   * Null is allowed only in development, where the app may use the
   * Expo host to reach a local backend.
   */
  readonly apiBaseUrl: string | null;
  readonly websocketUrl: string | null;
  readonly sentryDsn: string | null;
  readonly posthogApiKey: string | null;
  readonly posthogHost: string;
};

const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

function readExtra(): RawExtra {
  const extra = Constants.expoConfig?.extra;

  return typeof extra === 'object' && extra !== null
    ? (extra as RawExtra)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function getExpoHost(): string | null {
  const expoConfig = Constants.expoConfig as { hostUri?: string } | undefined;
  const hostUri = asString(expoConfig?.hostUri);

  if (hostUri === null) {
    return null;
  }

  const normalized = hostUri
    .replace(/^https?:\/\//, '')
    .replace(/^exp:\/\//, '')
    .replace(/\/.*$/, '');

  const delimiter = normalized.lastIndexOf(':');

  if (delimiter <= 0) {
    return normalized.length > 0 ? normalized : null;
  }

  const host = normalized.slice(0, delimiter);

  return host.length > 0 ? host : null;
}

function resolveApiBaseUrl(
  value: unknown,
  mode: AppMode,
): string | null {
  const explicit = asString(value);

  if (explicit !== null) {
    return explicit;
  }

  if (mode === 'production' || mode === 'staging') {
    throw new Error(
      `API base URL is required in ${mode} mode.`,
    );
  }

  const host = getExpoHost();

  if (host === null) {
    return null;
  }

  return `http://${host}:3000/v1`;
}

function resolveWebsocketUrl(
  value: unknown,
  apiBaseUrl: string | null,
): string | null {
  const explicit = asString(value);

  if (explicit !== null) {
    return explicit;
  }

  if (apiBaseUrl === null) {
    return null;
  }

  return apiBaseUrl
    .replace(/^http/, 'ws')
    .replace(/\/v1\/?$/, '/realtime');
}

function resolveMode(value: unknown): AppMode {
  if (
    value === 'production' ||
    value === 'staging' ||
    value === 'development'
  ) {
    return value;
  }

  return process.env.NODE_ENV === 'production'
    ? 'production'
    : 'development';
}

function createEnv(): Env {
  const extra = readExtra();
  const mode = resolveMode(extra.mode);
  const apiBaseUrl = resolveApiBaseUrl(extra.apiBaseUrl, mode);

  return {
    mode,
    isDev: mode === 'development',
    isProduction: mode === 'production',
    apiBaseUrl,
    websocketUrl: resolveWebsocketUrl(
      extra.websocketUrl,
      apiBaseUrl,
    ),
    sentryDsn: asString(extra.sentryDsn),
    posthogApiKey: asString(extra.posthogApiKey),
    posthogHost:
      asString(extra.posthogHost) ?? DEFAULT_POSTHOG_HOST,
  };
}

export const env: Env = createEnv();