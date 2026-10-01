import { describe, expect, it } from 'vitest';

import { redactForLog } from './redact';

describe('redactForLog', () => {
  it('strips login secrets and leaves non-sensitive fields', () => {
    expect(
      redactForLog({
        token: 'sj3bB93zbeaobfrzI88B1bm1_AVdX0RlFsgW2hxv84A',
        challengeId: '11111111-1111-4111-8111-111111111111',
        nested: { refreshToken: 'secret', pollToken: 'poll' },
      }),
    ).toEqual({
      token: '[redacted]',
      challengeId: '11111111-1111-4111-8111-111111111111',
      nested: { refreshToken: '[redacted]', pollToken: '[redacted]' },
    });
  });
});
