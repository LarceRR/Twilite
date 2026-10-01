import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryInvalidateScheduler } from './scheduleQueryInvalidate';

describe('createQueryInvalidateScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once after the delay when scheduled many times', () => {
    const run = vi.fn();
    const scheduler = createQueryInvalidateScheduler(400);

    scheduler.schedule(run);
    scheduler.schedule(run);
    scheduler.schedule(run);

    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(399);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('allows another run after the previous flush', () => {
    const run = vi.fn();
    const scheduler = createQueryInvalidateScheduler(100);

    scheduler.schedule(run);
    vi.advanceTimersByTime(100);
    scheduler.schedule(run);
    vi.advanceTimersByTime(100);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('cancel prevents a pending run', () => {
    const run = vi.fn();
    const scheduler = createQueryInvalidateScheduler(200);

    scheduler.schedule(run);
    scheduler.cancel();
    vi.advanceTimersByTime(200);

    expect(run).not.toHaveBeenCalled();
  });
});
