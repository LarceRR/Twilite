# Phase 0: Contracts Foundation

**Goal:** freeze interfaces before parallel agents touch behavior. Owner: API first, then PG/MOB.

## P0-S1 ADR gate
Read ADR-001..016. Convert Proposed ADR-014 into explicit owner decision before deletion work. Output: checked status board.

## P0-S2 Package and schema
Create `@twilite/contracts` with TPO, mobile DTO, catalog pagination, surface binding, upload ticket, error registry, limits and event schemas. Add semver and generated declarations. **DoD:** API parses its own request/response schemas.

## P0-S3 Golden fixtures
Add valid/invalid JSON and minimal PNG fixtures listed in 04. Test exact failure codes, not only boolean failure. Include legacy metadata-only surface fixture.

## P0-S4 CI publication
Publish package from API or a neutral contracts package; pin consumers. CI must fail when generated output is stale. Verify Expo Metro and Vite resolution.

## P0-S5 Limits/errors
Add limits endpoint and stable error envelope. Ensure every story uses registry codes. Generate a machine-readable matrix for docs.

## P0-S6 PG consumer
Replace handwritten manifest/DTO types with package imports. Fetch limits on editor boot; block >160 with downscale/crop. Keep server rejection handling.

## P0-S7 MOB consumer
Replace handwritten contracts, add runtime parsing at HTTP and realtime boundaries. Preserve legacy adapter until P5-S4.

**Exit gate:** all three repos pass the same fixture suite; no duplicate canonical schema remains.
