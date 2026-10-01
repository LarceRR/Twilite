# Phase 3: PG Authoring

## P3-S1 Canvas UX
Consume API limits. For imported >160, show exact reason and actions: nearest downscale or center crop. Never silently alter source. Submit uses post-transform dimensions.

## P3-S2 Export correctness
`prepareFramePng` must export active frame, not `frames[0]`. Add test that changes active frame and compares pixels. Keep sheet export row-major and nearest.

## P3-S3 Reliable submit
Model upload -> confirm -> submit as resumable steps. Send idempotency keys, retain ticket/resource state, retry only safe steps, show success and cleanup guidance. On confirm failure never submit.

## P3-S4 Resubmit
Load rejected/published object manifest and sheet into editor, preserve title, create new revision, never assume old head becomes unavailable. Handle conflicts and moderation status.

## P3-S5 Paging/moderation
Implement cursor pagination for catalog, mine and moderation. Disable self-moderation and map server codes. Do not display pending public URLs outside author/moderator scope.

## P3-S6 Error UX
Map stable codes to Russian/English-safe messages; preserve request ID for support. Do not expose storage internals.

**Exit gate:** fixture parity, imported-large-canvas UX, active-frame test, retry/idempotency tests.
