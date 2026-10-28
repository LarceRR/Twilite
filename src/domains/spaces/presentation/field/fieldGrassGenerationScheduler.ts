export type FieldGrassGenerationBatchResult = {
  readonly processed: number;
  readonly done: boolean;
};

type FieldGrassGenerationTask = {
  readonly batchSize: number;
  readonly frameBudget: number;
  readonly process: (allowance: number) => FieldGrassGenerationBatchResult;
};

const fieldGrassGenerationTasks = new Map<number, FieldGrassGenerationTask>();
let nextTaskId = 1;
let nextFrameStartIndex = 0;
let scheduledFrameId: number | null = null;

function scheduleNextFrame(): void {
  if (scheduledFrameId !== null || fieldGrassGenerationTasks.size === 0) return;
  scheduledFrameId = requestAnimationFrame(runFieldGrassGenerationFrame);
}

function runFieldGrassGenerationFrame(): void {
  scheduledFrameId = null;
  const tasks = Array.from(fieldGrassGenerationTasks.entries());
  if (tasks.length === 0) return;

  // If settings change during streaming, use the stricter budget until all
  // tasks have picked up the same value.
  const frameBudget = Math.max(
    1,
    Math.floor(Math.min(...tasks.map(([, task]) => task.frameBudget))),
  );
  const startIndex = nextFrameStartIndex % tasks.length;
  let remaining = frameBudget;

  for (let offset = 0; offset < tasks.length && remaining > 0; offset += 1) {
    const [taskId, task] = tasks[(startIndex + offset) % tasks.length];
    if (!fieldGrassGenerationTasks.has(taskId)) continue;

    const allowance = Math.min(task.batchSize, remaining);
    const result = task.process(allowance);
    const processed = Math.max(0, Math.min(allowance, Math.floor(result.processed)));
    remaining -= processed;

    if (result.done) fieldGrassGenerationTasks.delete(taskId);
  }

  nextFrameStartIndex = tasks.length > 1 ? (startIndex + 1) % tasks.length : 0;
  scheduleNextFrame();
}

/**
 * Register one streamed chunk with the shared scheduler. At most frameBudget
 * instances are prepared across every active chunk in a frame; tasks are served
 * round-robin to keep one large chunk from starving the others.
 */
export function scheduleFieldGrassGeneration(
  task: FieldGrassGenerationTask,
): () => void {
  const taskId = nextTaskId;
  nextTaskId += 1;
  fieldGrassGenerationTasks.set(taskId, {
    ...task,
    batchSize: Math.max(1, Math.floor(task.batchSize)),
    frameBudget: Math.max(1, Math.floor(task.frameBudget)),
  });
  scheduleNextFrame();

  return () => {
    fieldGrassGenerationTasks.delete(taskId);
    if (fieldGrassGenerationTasks.size === 0 && scheduledFrameId !== null) {
      cancelAnimationFrame(scheduledFrameId);
      scheduledFrameId = null;
      nextFrameStartIndex = 0;
    }
  };
}

/** Exposed for tests and developer diagnostics; does not allocate GPU resources. */
export function activeFieldGrassGenerationTaskCount(): number {
  return fieldGrassGenerationTasks.size;
}
