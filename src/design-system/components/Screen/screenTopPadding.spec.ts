import { describe, expect, it } from 'vitest';

import { spacing } from '../../spacing/spacing';
import { screenTopPadding } from './screenTopPadding';

describe('screenTopPadding', () => {
  it('includes the status-bar inset by default', () => {
    expect(screenTopPadding(47, false)).toBe(47 + spacing.md);
  });

  it('skips the status-bar inset for native sheets', () => {
    expect(screenTopPadding(47, true)).toBe(spacing.md);
  });
});
