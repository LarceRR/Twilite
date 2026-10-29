export const storageKeys = {
  authSession: 'twilite.auth.session',
  localBackendState: 'twilite.local-backend.state',
  legacySpacesSnapshot: 'twilite.spaces.snapshot',
  localStateSchema: 'twilite.local-state.schema',
  legacyOfflineQueue: 'twilite.offline-queue',
  settings: 'twilite.settings',
  queryCache: 'twilite.query-cache',
} as const;

export const httpConfig = { timeoutMs: 15_000, retryLimit: 2 } as const;
export const cacheConfig = {
  queryStaleMs: 30_000,
  profileStaleMs: 10 * 60_000,
  sessionsStaleMs: 15_000,
} as const;
