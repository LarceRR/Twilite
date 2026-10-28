import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activeFieldGrassGenerationTaskCount,
  scheduleFieldGrassGeneration,
} from './fieldGrassGenerationScheduler';

type ScheduledFrame = {
  readonly id: number;
  readonly callback: (timestamp: number) => void;
};

describe('field grass generation scheduler', () => {
  let nextFrameId = 1;
  let frames: ScheduledFrame[] = [];
  let cleanupTasks: Array<() => void> = [];

  afterEach(() => {
    cleanupTasks.forEach((cleanup) => cleanup());
    cleanupTasks = [];
    frames = [];
    vi.unstubAllGlobals();
  });

  function installAnimationFrameMock(): void {
    vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.push({ id, callback });
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames = frames.filter((frame) => frame.id !== id);
    });
  }

  function flushOneFrame(): void {
    const frame = frames.shift();
    expect(frame).toBeDefined();
    frame?.callback(16);
  }

  it('caps combined work per frame and rotates fairly between chunks', () => {
    installAnimationFrameMock();
    const processedByTask = [0, 0, 0];
    const frameBudget = 200;

    processedByTask.forEach((_, index) => {
      cleanupTasks.push(
        scheduleFieldGrassGeneration({
          batchSize: 1000,
          frameBudget,
          process: (allowance) => {
            processedByTask[index] += allowance;
            return {
              processed: allowance,
              done: processedByTask[index] >= 400,
            };
          },
        }),
      );
    });

    for (let frame = 0; frame < 3; frame += 1) {
      const before = processedByTask.reduce((sum, value) => sum + value, 0);
      flushOneFrame();
      const after = processedByTask.reduce((sum, value) => sum + value, 0);
      expect(after - before).toBeLessThanOrEqual(frameBudget);
    }

    expect(processedByTask).toEqual([200, 200, 200]);
    expect(activeFieldGrassGenerationTaskCount()).toBe(3);

    while (activeFieldGrassGenerationTaskCount() > 0) {
      const before = processedByTask.reduce((sum, value) => sum + value, 0);
      flushOneFrame();
      const after = processedByTask.reduce((sum, value) => sum + value, 0);
      expect(after - before).toBeLessThanOrEqual(frameBudget);
    }

    expect(processedByTask).toEqual([400, 400, 400]);
  });
});
