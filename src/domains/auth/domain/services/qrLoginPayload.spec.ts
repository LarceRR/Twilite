import { describe, expect, it } from 'vitest';

import {
  buildQrLoginPayload,
  parseQrLoginPayload,
  QR_LOGIN_TOKEN_BYTES,
} from './qrLoginPayload';

function tokenFromBytes(fill: number): string {
  const bytes = Uint8Array.from({ length: QR_LOGIN_TOKEN_BYTES }, () => fill);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

describe('qr login payload', () => {
  it('round-trips a 32-byte token', () => {
    const token = tokenFromBytes(7);
    const payload = buildQrLoginPayload(token);

    expect(payload.startsWith('twilite.login.v1.')).toBe(true);
    expect(payload.includes('://')).toBe(false);
    expect(parseQrLoginPayload(payload)).toBe(token);
    expect(parseQrLoginPayload(token)).toBe(token);
    expect(parseQrLoginPayload(`twilite://login?v=1&token=${token}`)).toBe(token);
  });

  it('rejects foreign schemes and short tokens', () => {
    const token = tokenFromBytes(9);
    expect(parseQrLoginPayload(`tg://login?v=1&token=${token}`)).toBeNull();
    expect(parseQrLoginPayload('https://evil.test/?token=abc')).toBeNull();
    expect(parseQrLoginPayload('javascript:alert(1)')).toBeNull();
    expect(parseQrLoginPayload(`twilite://login?v=2&token=${token}`)).toBeNull();
    expect(parseQrLoginPayload('')).toBeNull();
    expect(parseQrLoginPayload('not-a-token')).toBeNull();
  });
});
