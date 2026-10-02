import { describe, expect, it } from 'vitest';

import {
  placeholderReasonFromHttpStatus,
  SPRITE_PLACEHOLDER_MOBILE,
} from './spritePlaceholder';

describe('spritePlaceholder', () => {
  it('maps http statuses', () => {
    expect(placeholderReasonFromHttpStatus(403)).toBe('forbidden');
    expect(placeholderReasonFromHttpStatus(404)).toBe('notFound');
    expect(placeholderReasonFromHttpStatus(503)).toBe('network');
  });

  it('exposes deterministic placeholder geometry', () => {
    expect(SPRITE_PLACEHOLDER_MOBILE.sheet.frameCount).toBe(1);
    expect(SPRITE_PLACEHOLDER_MOBILE.sheetUrl).toBe('');
  });
});
