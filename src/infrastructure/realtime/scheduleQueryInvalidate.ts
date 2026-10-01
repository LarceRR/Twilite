/**
 * Coalesces rapid invalidate bursts (e.g. duplicate realtime sockets)
 * into a single React Query refresh.
 */
export function createQueryInvalidateScheduler(delayMs: number): {
  schedule(run: () => void): void;
  cancel(): void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(run) {
      if (timer !== null) {
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        run();
      }, delayMs);
    },
    cancel() {
      if (timer === null) {
        return;
      }
      clearTimeout(timer);
      timer = null;
    },
  };
}
