import type { ConfigContext, ExpoConfig } from 'expo/config';

const PRODUCTION_API_BASE_URL = 'https://api.twilite.ru/v1';

type AppEnvironment = 'development' | 'staging' | 'production';

function resolveEnvironment(): AppEnvironment {
  const value = process.env.APP_ENV;

  if (
    value === 'production' ||
    value === 'staging' ||
    value === 'development'
  ) {
    return value;
  }

  return 'development';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = resolveEnvironment();

  const apiBaseUrl =
    environment === 'production'
      ? PRODUCTION_API_BASE_URL
      : null;

  return {
    ...config,
    name: config.name ?? 'Twilite',
    slug: config.slug ?? 'twilite',
    version: config.version ?? '1.0.2',
    orientation: config.orientation ?? 'portrait',
    icon: config.icon ?? './assets/icon.png',
    scheme: config.scheme ?? 'twilite',
    userInterfaceStyle: config.userInterfaceStyle ?? 'light',
    newArchEnabled: config.newArchEnabled ?? true,
    extra: {
      ...(config.extra ?? {}),
      mode: environment,
      apiBaseUrl,
      websocketUrl: null,
    },
  };
};