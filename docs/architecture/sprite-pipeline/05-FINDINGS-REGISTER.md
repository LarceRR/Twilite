# 05. Findings Register

Evidence is from `master` as captured 2026-10-01. Severity is triage, not a substitute for tests.

## SEC-01
**Severity:** High | **Stage:** S5 | **Evidence:** `twilite-backend/src/modules/media/presentation/controllers/media.controller.ts`, `confirm()` updates by assetId with no owner predicate or CurrentUser. **Scenario:** authenticated user confirms another user's pending asset and receives its public URL. **Impact:** IDOR, premature publication of bytes. **Fix:** owner-scoped update; return 404; test cross-user confirm. **Story:** P1-S1.

## SEC-02
**Severity:** High | **Stage:** S5 | **Evidence:** same controller plus `r2Storage.ts`: confirm does not HEAD R2; presign omits ContentLength. **Scenario:** missing, oversized or wrong bytes become ready; other media kinds may never be revalidated. **Impact:** storage abuse and integrity failure. **Fix:** bounded HEAD before ready, exact size/type, reject and delete mismatch. **Story:** P1-S2/P1-S3.

## SEC-03
**Severity:** High | **Stage:** S3-S5 | **Evidence:** `limits.ts` declares image max and daily uploads, but create upload path does not apply them. **Scenario:** user creates unlimited pending tickets or uploads oversized generic media. **Impact:** cost/DoS. **Fix:** kind policy registry + quota transaction + cleanup job. **Story:** P1-S4.

## SEC-04
**Severity:** Medium | **Stage:** S6 | **Evidence:** storage key includes `{userId}/{kind}/{uuid}` and returned ticket exposes it. **Scenario:** public URL enumeration leaks account identifier even when UUID is secret. **Impact:** metadata privacy. **Fix:** opaque tenant-neutral key; preserve owner in DB. **Story:** P1-S6.

## SEC-05
**Severity:** Medium | **Stage:** S7 | **Evidence:** UUID params are plain strings in pixel controller. **Scenario:** malformed IDs reach DB or produce inconsistent errors. **Impact:** noisy errors and probing. **Fix:** UUID pipe/schema. **Story:** P1-S7.

## COR-01
**Severity:** High | **Stage:** S6 | **Evidence:** PG `MAX_DOCUMENT_EDGE=1024`; API `PIXEL_OBJECT_CANVAS_MAX=160`. **Scenario:** imported document edits successfully then submit fails. **Impact:** broken author flow and contract drift. **Fix:** fetch limits, block/downscale/crop before pack. **Story:** P3-S1.

## COR-02
**Severity:** High | **Stage:** S9 | **Evidence:** `surface.contract.ts` metadata is open; create handler stores it; no pixel object lookup. **Scenario:** random/unpublished id creates a surface object and mobile silently omits sprite. **Fix:** first-class nullable FK and published-state check. **Story:** P2-S6.

## COR-03
**Severity:** High | **Stage:** S7 | **Evidence:** `pixelObjects.service.ts resubmit()` changes published head to pending; `getPublished()` requires status published. **Scenario:** all existing placements go blank while review runs. **Fix:** immutable revisions and stable live revision. **Story:** P2-S1/P2-S2.

## COR-04
**Severity:** Medium | **Stage:** S8 | **Evidence:** API list hardcodes 50; mobile consumes all returned items. **Scenario:** catalog silently truncates. **Fix:** cursor pagination and client paging. **Story:** P2-S4/P3-S5/P4-S9.

## COR-05
**Severity:** Medium | **Stage:** S10 | **Evidence:** mobile `useFieldMobileAssets.ts` uses `staleTime: Infinity`, query key lacks revision, and omits missing DTOs. **Scenario:** updated sheet never refreshes; partners see blank assets. **Fix:** revision key, embed-first resolution, placeholder/error state. **Story:** P4-S2/P4-S3.

## PERF-01
**Severity:** High | **Stage:** S11 | **Evidence:** `glSpriteDraw.ts drawSpriteQuad()` creates and deletes two buffers for every sprite every paint. **Scenario:** 50 sprites at RAF cause 100 buffer allocations/deletions per frame. **Impact:** frame spikes and driver pressure. **Fix:** reusable/static quad or instanced buffer. **Story:** P4-S5.

## PERF-02
**Severity:** Medium | **Stage:** S8/S11 | **Evidence:** catalog `PixelSheetPreview` path and field GL path duplicate shader/loading logic; one preview GLView per card. **Fix:** static preview PNG, shared loader only in field. **Story:** P4-S8/P4-S10.

## PERF-03
**Severity:** High | **Stage:** S10-S11 | **Evidence:** `FieldSpriteGlLayer` has Map cache but no byte/count budget and sequential `ensureSheets`; texture failures are swallowed. **Fix:** concurrency 3, LRU 32/48 MiB, retry and telemetry. **Story:** P4-S4/P4-S12.

## REL-01
**Severity:** Medium | **Stage:** S4-S5 | **Evidence:** confirm marks ready without upload verification; orphan cleanup not documented. **Fix:** state machine, HEAD, scheduled GC. **Story:** P1-S2/P2-S9.

## REL-02
**Severity:** Medium | **Stage:** S9-S10 | **Evidence:** realtime sync upserts surface object only; new partner object causes separate DTO query. **Fix:** embed DTO in event/snapshot, fallback only for legacy. **Story:** P2-S7/P4-S2.

## MNT-01
**Severity:** Medium | **Stage:** S11 | **Evidence:** unused `FieldSpriteOverlay`, Three billboards and `SceneView`; flipY behavior differs. **Fix:** quarantine, parity tests, delete after one release. **Story:** P4-S10.

## MNT-02
**Severity:** Medium | **Stage:** S1-S8 | **Evidence:** API zod, MOB handwritten types, PG handwritten types. **Fix:** contracts package and fixture gate. **Story:** P0-S2/P0-S3.

## Product decisions recorded

- Fire/Cloud without pixel binding remain valid and receive placeholder rendering.
- Public pixel sheet URLs remain public by design; pending URLs are not shown to mobile and should be minimized in author DTOs.
- `reduceMotion` freezes sprite animation.
- `LIMIT_OBJECTS_PER_SURFACE` is enforced now.
