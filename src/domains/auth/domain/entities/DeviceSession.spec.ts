import { describe, expect, it } from 'vitest';

import {
  compareDeviceSessions,
  describeDeviceSession,
  type DeviceSession,
  formatSessionLastUsed,
  isDeviceSessionActive,
} from './DeviceSession';

function session(overrides: Partial<DeviceSession>): DeviceSession {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    platform: 'ios',
    model: 'iPhone',
    appVersion: '1.0.2',
    ipLabel: '203.0.113.x',
    createdAt: '2026-09-29T00:00:00.000Z',
    lastUsedAt: '2026-09-29T00:00:00.000Z',
    expiresAt: '2026-10-06T00:00:00.000Z',
    current: false,
    ...overrides,
  };
}

describe('describeDeviceSession', () => {
  const now = Date.parse('2026-09-29T00:05:00.000Z');

  it('labels the current phone as the Twilite mobile app', () => {
    expect(describeDeviceSession(session({ current: true }), now)).toEqual({
      title: 'iPhone',
      subtitle: 'Мобильное приложение Twilite · это устройство · 5 мин назад',
    });
  });

  it('names the playground and marks it as a web app', () => {
    expect(
      describeDeviceSession(
        session({
          platform: 'web',
          model: 'Mozilla/5.0',
          appVersion: 'tpg-web',
          current: false,
        }),
        now,
      ),
    ).toEqual({
      title: 'Twilite Pixelart Generator',
      subtitle: 'Веб-приложение · 5 мин назад',
    });
  });
});

describe('isDeviceSessionActive', () => {
  const now = Date.parse('2026-09-29T12:00:00.000Z');

  it('drops expired sessions', () => {
    expect(isDeviceSessionActive(session({ expiresAt: '2026-09-29T11:00:00.000Z' }), now)).toBe(false);
    expect(isDeviceSessionActive(session({ expiresAt: '2026-09-29T13:00:00.000Z' }), now)).toBe(true);
  });
});

describe('formatSessionLastUsed', () => {
  const now = Date.parse('2026-09-29T12:00:00.000Z');

  it('uses relative Russian labels', () => {
    expect(formatSessionLastUsed('2026-09-29T11:59:30.000Z', now)).toBe('только что');
    expect(formatSessionLastUsed('2026-09-29T11:50:00.000Z', now)).toBe('10 мин назад');
    expect(formatSessionLastUsed('2026-09-29T09:00:00.000Z', now)).toBe('3 ч назад');
  });
});

describe('compareDeviceSessions', () => {
  it('puts the current session first, then newest last-used', () => {
    const current = session({ id: 'current', current: true, lastUsedAt: '2026-09-01T00:00:00.000Z' });
    const newer = session({ id: 'newer', lastUsedAt: '2026-09-29T00:00:00.000Z' });
    const older = session({ id: 'older', lastUsedAt: '2026-09-10T00:00:00.000Z' });

    expect([older, newer, current].sort(compareDeviceSessions).map((item) => item.id)).toEqual([
      'current',
      'newer',
      'older',
    ]);
  });
});
