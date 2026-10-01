import { describe, expect, it } from 'vitest';

import { isExternalQrLoginPath } from './rejectQrLoginDeepLink';

describe('isExternalQrLoginPath', () => {
  it('rejects custom-scheme login URLs that carry a token', () => {
    expect(isExternalQrLoginPath('twilite://login?v=1&token=abc')).toBe(true);
    expect(isExternalQrLoginPath('/login?v=1&token=abc')).toBe(true);
    expect(isExternalQrLoginPath('login?token=abc')).toBe(true);
  });

  it('lets normal app paths through', () => {
    expect(isExternalQrLoginPath('/profile')).toBe(false);
    expect(isExternalQrLoginPath('/devices')).toBe(false);
    expect(isExternalQrLoginPath('/qr-scan')).toBe(false);
    expect(isExternalQrLoginPath('/qr-confirm')).toBe(false);
    expect(isExternalQrLoginPath('')).toBe(false);
  });
});
