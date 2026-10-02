import { describe, expect, it } from 'vitest';

import { shouldShowScreenBack } from './shouldShowScreenBack';

describe('shouldShowScreenBack', () => {
  it('shows back only on a focused pushed screen that can go back', () => {
    expect(
      shouldShowScreenBack({
        hideBack: false,
        isFocused: true,
        isTabRoot: false,
        canGoBack: true,
      }),
    ).toBe(true);
  });

  it('hides back on unfocused screens during interactive pop', () => {
    expect(
      shouldShowScreenBack({
        hideBack: false,
        isFocused: false,
        isTabRoot: false,
        canGoBack: true,
      }),
    ).toBe(false);
  });

  it('hides back on tab roots and when explicitly disabled', () => {
    expect(
      shouldShowScreenBack({
        hideBack: false,
        isFocused: true,
        isTabRoot: true,
        canGoBack: true,
      }),
    ).toBe(false);
    expect(
      shouldShowScreenBack({
        hideBack: true,
        isFocused: true,
        isTabRoot: false,
        canGoBack: true,
      }),
    ).toBe(false);
  });

  it('hides back when the stack cannot go back', () => {
    expect(
      shouldShowScreenBack({
        hideBack: false,
        isFocused: true,
        isTabRoot: false,
        canGoBack: false,
      }),
    ).toBe(false);
  });
});
