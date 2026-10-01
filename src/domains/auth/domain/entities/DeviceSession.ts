export type DevicePlatform = 'ios' | 'android' | 'web' | 'unknown';

export const PIXELART_GENERATOR_APP_VERSION = 'tpg-web';

export type DeviceSession = {
  readonly id: string;
  readonly platform: DevicePlatform;
  readonly model: string | null;
  readonly appVersion: string | null;
  readonly ipLabel: string | null;
  readonly createdAt: string;
  readonly lastUsedAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
};

export type DeviceAppKind = 'pixelart-generator' | 'mobile' | 'web' | 'unknown';

export function isPixelartGeneratorSession(session: DeviceSession): boolean {
  return session.appVersion === PIXELART_GENERATOR_APP_VERSION;
}

export function deviceAppKind(session: DeviceSession): DeviceAppKind {
  if (isPixelartGeneratorSession(session)) {
    return 'pixelart-generator';
  }
  if (session.platform === 'ios' || session.platform === 'android') {
    return 'mobile';
  }
  if (session.platform === 'web') {
    return 'web';
  }
  return 'unknown';
}

export function isDeviceSessionActive(session: DeviceSession, now: number): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  return !Number.isNaN(expiresAt) && expiresAt > now;
}

export function compareDeviceSessions(a: DeviceSession, b: DeviceSession): number {
  if (a.current !== b.current) {
    return a.current ? -1 : 1;
  }

  return Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt);
}

export function describeDeviceSession(
  session: DeviceSession,
  now: number,
): { readonly title: string; readonly subtitle: string } {
  const kind = deviceAppKind(session);
  const lastUsed = formatSessionLastUsed(session.lastUsedAt, now);

  if (kind === 'pixelart-generator') {
    return {
      title: 'Twilite Pixelart Generator',
      subtitle: joinParts(['Веб-приложение', lastUsed, session.current ? 'это устройство' : null]),
    };
  }

  if (kind === 'mobile') {
    const deviceName =
      session.model !== null && session.model.length > 0
        ? session.model
        : platformLabel(session.platform);
    return {
      title: deviceName,
      subtitle: joinParts([
        'Мобильное приложение Twilite',
        session.current ? 'это устройство' : null,
        lastUsed,
      ]),
    };
  }

  const title =
    session.model !== null && session.model.length > 0
      ? session.model
      : platformLabel(session.platform);

  return {
    title,
    subtitle: joinParts([
      kind === 'web' ? 'Браузер' : 'Устройство',
      session.current ? 'это устройство' : null,
      lastUsed,
    ]),
  };
}

export function formatSessionLastUsed(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return '';
  }

  const delta = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) {
    return 'только что';
  }
  if (delta < hour) {
    return `${Math.floor(delta / minute)} мин назад`;
  }
  if (delta < day) {
    return `${Math.floor(delta / hour)} ч назад`;
  }

  return new Date(then).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function formatSessionDateTime(iso: string): string {
  const value = Date.parse(iso);
  if (Number.isNaN(value)) {
    return '—';
  }

  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function appKindLabel(session: DeviceSession): string {
  switch (deviceAppKind(session)) {
    case 'pixelart-generator':
      return 'Twilite Pixelart Generator';
    case 'mobile':
      return 'Мобильное приложение Twilite';
    case 'web':
      return 'Браузер';
    default:
      return 'Неизвестное приложение';
  }
}

export function platformDetailLabel(platform: DevicePlatform): string {
  switch (platform) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return 'Неизвестно';
  }
}

function platformLabel(platform: DevicePlatform): string {
  switch (platform) {
    case 'ios':
      return 'iPhone';
    case 'android':
      return 'Android';
    case 'web':
      return 'Браузер';
    default:
      return 'Устройство';
  }
}

function joinParts(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' · ');
}
