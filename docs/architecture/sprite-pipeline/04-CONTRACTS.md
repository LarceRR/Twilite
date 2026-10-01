# 04. Cross-repo Contracts

This file is normative. If code and this file disagree, stop the story and open an ADR; do not silently change one client.

## 1. Package

Create a versioned package `@twilite/contracts` owned by API. It exports zod schemas, inferred TS types, constants, error codes and fixtures. API, PG and MOB import it. Until package publishing is wired, vendor the exact generated artifact with a checksum and a CI comparison, never hand-edit copies.

## 2. TPO v1 canonical schema

```ts
format: 'twilite.pixelobject/v1'
canvas: { width: int 1..160, height: int 1..160 }
sheet: { mediaId: uuid, frameWidth: canvas.width, frameHeight: canvas.height,
  columns: int 1..64, rows: int 1..64, frameCount: int 1..64 }
animations: [{ id: 'default', loop: true,
  frames: [{ frame: int 0..frameCount-1, durationMs: int 16..10000 }] }]
staticPreviewFrame: int 0..frameCount-1
```
Invariants: exactly one animation, frame list length equals frameCount, each frame appears once, grid cells >= frameCount, PNG dimensions equal frameWidth*columns by frameHeight*rows, all frame regions have at least one alpha > 0, PNG/non-animated, bytes <= 8 MiB.

## 3. DTOs

`PixelObjectCatalogItem`: id, title, status only where authorized, revision, manifest, sheetUrl, previewUrl, timestamps. `PixelObjectMobileDto`: id, title, revision, format, sheetUrl, previewUrl, canvas, geometry, animation and staticPreviewFrame. Never expose `mediaId` in mobile DTO.

`SurfaceObjectDto`: current fields plus nullable `pixelObjectId` and nullable `pixelObject` embedded mobile DTO. During compatibility, server may derive these from legacy metadata. Client must prefer explicit field, then embedded DTO, then `/mobile` fallback.

## 4. Commands and query semantics

- `POST /media/uploads`: authenticated, idempotent by user + key; ticket has assetId, URL, exact signed content type/cache headers, expiry.
- `POST /media/uploads/:id/confirm`: owner only; HEAD verifies existence, content type and exact declared bytes; returns stable error code.
- `POST /tpg/pixel-objects`: creates pending revision; idempotency required.
- `PATCH /tpg/pixel-objects/:id`: creates next pending revision; current published remains served.
- `GET /tpg/pixel-objects?cursor=&limit=`: published current revisions, deterministic `publishedAt,id` ordering.
- `POST /spaces/:id/surface-objects`: accepts `kind`, optional subject and optional pixelObjectId; server requires published object or rejects `PIXEL_OBJECT_NOT_PUBLISHED`.

## 5. Stable error registry

`MEDIA_UPLOAD_FORBIDDEN`, `MEDIA_OBJECT_MISSING`, `MEDIA_SIZE_MISMATCH`, `MEDIA_CONTENT_TYPE_MISMATCH`, `MEDIA_QUOTA_EXCEEDED`, `PIXEL_OBJECT_INVALID_MANIFEST`, `PIXEL_OBJECT_NOT_FOUND`, `PIXEL_OBJECT_NOT_PUBLISHED`, `PIXEL_OBJECT_SELF_MODERATION`, `PIXEL_OBJECT_PENDING`, `SURFACE_FULL`, `SURFACE_METADATA_TOO_LARGE`, `IDEMPOTENCY_CONFLICT`, `CONTRACT_INVALID`, `STORAGE_UNAVAILABLE`.

HTTP mapping: 400 malformed input, 401 unauthenticated, 403 authenticated but forbidden, 404 inaccessible resource, 409 state/idempotency/version conflict, 422 semantically invalid media/manifest, 429 quota, 503 storage dependency. Error body: `{ code, message, details?, requestId }`; never return presigned URLs in logs.

## 6. Limits endpoint and source of truth

API `LIMIT_DEFINITIONS` is authoritative. Add `GET /tpg/pixel-objects/limits` returning canvasMax, maxFrames, sheetMaxBytes, duration bounds, titleMax, surfaceMax and supported format. PG uses it for UX and still treats server responses as final. MOB uses only display/runtime safety caps.

## 7. Fixtures and compatibility

Required fixtures: one-frame, 64-frame, transparent rejection, duplicate frame, wrong geometry, >160 canvas, >8 MiB, invalid DTO, published surface with embed, legacy metadata-only surface and missing sprite. Every repo must parse the same JSON and assert the same accept/reject result. Breaking changes require `v2`, dual-read, migration and release notes.
