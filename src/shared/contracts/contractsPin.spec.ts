import { describe, expect, it } from 'vitest';

import { CONTRACT_ERROR_CODES, isContractErrorCode } from './errors';
import { DEFAULT_PIXEL_OBJECT_LIMITS, PIXEL_OBJECT_FORMAT } from './limits';

describe('contracts pin (P0-S7)', () => {
  it('exposes stable error codes', () => {
    expect(CONTRACT_ERROR_CODES).toContain('MEDIA_QUOTA_EXCEEDED');
    expect(CONTRACT_ERROR_CODES).toContain('PIXEL_OBJECT_SELF_MODERATION');
    expect(isContractErrorCode('CONTRACT_INVALID')).toBe(true);
    expect(isContractErrorCode('NOPE')).toBe(false);
  });

  it('pins default TPO limits', () => {
    expect(DEFAULT_PIXEL_OBJECT_LIMITS.canvasMax).toBe(160);
    expect(DEFAULT_PIXEL_OBJECT_LIMITS.sheetMaxBytes).toBe(8 * 1024 * 1024);
    expect(PIXEL_OBJECT_FORMAT).toBe('twilite.pixelobject/v1');
  });
});
