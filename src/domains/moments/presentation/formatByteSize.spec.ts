import { describe, expect, it } from 'vitest';

import { formatByteSize } from './formatByteSize';

describe('formatByteSize', () => {
  it('uses the catalog frame units', () => {
    expect(formatByteSize(0)).toBe('0K');
    expect(formatByteSize(500)).toBe('500B');
    expect(formatByteSize(192 * 1024)).toBe('192K');
    expect(formatByteSize(2.5 * 1024 * 1024)).toBe('2.5M');
  });
});
