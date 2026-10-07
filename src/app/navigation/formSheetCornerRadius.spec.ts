import { describe, expect, it } from 'vitest';

import { spacing } from '@/design-system/spacing/spacing';

import { FORM_SHEET_CORNER_RADIUS } from './formSheetCornerRadius';

describe('FORM_SHEET_CORNER_RADIUS', () => {
  it('matches the compact create sheet radius', () => {
    expect(FORM_SHEET_CORNER_RADIUS).toBe(spacing.xxxl);
  });
});
