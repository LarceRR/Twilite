import { describe, expect, it, vi } from 'vitest';

vi.mock('three', () => ({
  setConsoleFunction: vi.fn(),
}));

import { setConsoleFunction } from 'three';

import { silenceThreeClockDeprecation } from './silenceThreeClockDeprecation';

describe('silenceThreeClockDeprecation', () => {
  it('registers a filter that drops Clock deprecation warns', () => {
    silenceThreeClockDeprecation();

    expect(setConsoleFunction).toHaveBeenCalledOnce();
    const filter = vi.mocked(setConsoleFunction).mock.calls[0]?.[0];
    expect(filter).toBeTypeOf('function');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    filter?.(
      'warn',
      'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
    );
    filter?.('warn', 'THREE.SomethingElse: still visible');

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('THREE.SomethingElse: still visible');
    warn.mockRestore();
  });
});
