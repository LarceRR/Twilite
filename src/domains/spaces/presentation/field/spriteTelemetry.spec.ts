import { describe, expect, it, vi } from 'vitest';

import { emitSpriteTelemetry, subscribeSpriteTelemetry } from './spriteTelemetry';

describe('spriteTelemetry', () => {
  it('delivers redacted events without urls', () => {
    const spy = vi.fn();
    const unsubscribe = subscribeSpriteTelemetry(spy);
    emitSpriteTelemetry({
      name: 'sprite.texture_failed',
      code: 'decode',
      width: 16,
      height: 16,
    });
    expect(spy).toHaveBeenCalledWith({
      name: 'sprite.texture_failed',
      code: 'decode',
      width: 16,
      height: 16,
    });
    const payload = JSON.stringify(spy.mock.calls[0]?.[0]);
    expect(payload).not.toMatch(/https?:/);
    unsubscribe();
  });
});
