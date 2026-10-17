let shadowUpdateRequested = true;

/** Request one bounded shadow-map refresh after scene geometry or lights change. */
export function requestFieldShadowUpdate(): void {
  shadowUpdateRequested = true;
}

/** Consume the pending invalidation from the scene's throttled render loop. */
export function consumeFieldShadowUpdate(): boolean {
  if (!shadowUpdateRequested) return false;
  shadowUpdateRequested = false;
  return true;
}
