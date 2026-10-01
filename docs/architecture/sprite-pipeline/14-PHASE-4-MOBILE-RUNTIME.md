# Phase 4: Mobile Runtime

## P4-S1 Runtime boundary
Parse catalog, mobile DTO, surface snapshot and realtime messages using shared schemas. Invalid rows become logged placeholders, never a render crash.

## P4-S2 Asset resolution
Prefer embedded DTO keyed by object ID + revision; fallback to `/mobile` only for legacy. React Query key includes revision. Invalidate on revision event and reconnect.

## P4-S3 Placeholder/error state
Every Fire/Cloud with missing, unpublished or failed sprite gets a deterministic built-in placeholder. Track reason: absent, forbidden, not found, network, decode.

## P4-S4 Texture manager
Create `SpriteTextureManager`: concurrency 3, retry 3, byte estimate, LRU 32/48 MiB, URL+revision key, cancellation on unmount. Emit `sprite.texture_failed` with safe dimensions/code, not URL/token.

## P4-S5 GL batching
Refactor `drawSpriteQuad` to reuse buffers or instancing. Prove zero create/delete buffer calls during RAF and one paint benchmark. Keep NEAREST, clamp and explicit Y orientation.

## P4-S6 Lifecycle
Recreate program/textures after context loss and foreground transition. Cancel stale loads by generation. Test background/reopen and low-memory eviction.

## P4-S7 Motion
When reduceMotion or app background is active, draw static preview and stop RAF. Add unit tests for animation decision and integration test for no RAF.

## P4-S8/S9 Catalog
Replace per-card GL preview with server `previewUrl`/static Image. Virtualize and paginate list. Keep search local within loaded pages.

## P4-S10 Dead code
After parity tests and one release window, remove unused Three/overlay loaders or mark one documented owner. Delete opposite flipY path if not used.

## P4-S11 Local sandbox
Ship deterministic fixture catalog and embedded PNGs; local mode must demo catalog, placement and field rendering.

## P4-S12 Telemetry
Measure texture load latency/failure, cache evictions, GL paint duration and visible sprite count. Redact URLs.

**Exit gate:** device trace on low-end Android/iOS meets NFRs; no silent missing assets.
