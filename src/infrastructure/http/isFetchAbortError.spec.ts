import { describe, expect, it } from 'vitest';

import { isFetchAbortError } from './isFetchAbortError';

describe('isFetchAbortError', () => {
  it('detects standard AbortError by name', () => {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    expect(isFetchAbortError(error)).toBe(true);
  });

  it('detects Expo fetch-failed abort message', () => {
    expect(
      isFetchAbortError(new Error('fetch failed: The operation was aborted.')),
    ).toBe(true);
  });

  it('detects Expo FetchRequestCanceledException', () => {
    expect(
      isFetchAbortError(
        new Error(
          'fetch failed: FetchRequestCanceledException: Fetch request has been canceled (at Expo/NativeResponse.swift:63)',
        ),
      ),
    ).toBe(true);
  });

  it('rejects unrelated network errors', () => {
    expect(isFetchAbortError(new Error('Network request failed'))).toBe(false);
    expect(isFetchAbortError(new Error('Failed to fetch'))).toBe(false);
    expect(isFetchAbortError(null)).toBe(false);
  });
});
