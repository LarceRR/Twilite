/** TanStack infinite query: only `undefined` means “no more pages”. */
export function timelineNextPageParam(nextCursor: string | null): string | undefined {
  return nextCursor ?? undefined;
}
