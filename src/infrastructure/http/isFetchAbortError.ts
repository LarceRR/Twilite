/**
 * Expo / React Native often wrap AbortSignal cancels as plain Errors whose
 * `name` is not `AbortError` (e.g. "fetch failed: The operation was aborted.",
 * FetchRequestCanceledException). Treat those as aborts too.
 */
export function isFetchAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;

  const message = error.message.toLowerCase();
  return (
    message.includes('aborted') ||
    message.includes('abort') ||
    message.includes('fetchrequestcanceledexception') ||
    message.includes('has been canceled') ||
    message.includes('has been cancelled')
  );
}
