# Phase 2: Domain Integrity

## P2-S1/P2-S2 Revisions
Add revision table and published revision pointer. Backfill each current row as revision 1. Submit/resubmit inserts immutable revision; publish atomically swaps pointer. Existing published remains resolvable. Add rollback command.

## P2-S3 Invariants
Validate row manifest defensively. A corrupt row must be quarantined/logged, not crash list. Enforce canonical grid, revision hash and media relation.

## P2-S4 Catalog pagination/limits
Cursor order `publishedAt desc,id desc`; validate limit against endpoint. Add limits endpoint and tests for >50 items.

## P2-S5 Archive
Add archive state and author/moderator command. Archived heads disappear from catalog but current placements resolve. Define restore and retention behavior.

## P2-S6 Binding
Migration adds nullable `surface_objects.pixel_object_id`, backfills only UUIDs with published heads, reports/quarantines invalid metadata. Create validates published state; PATCH rejects binding changes. Keep dual-read.

## P2-S7 Embed
Surface snapshot and realtime events include optional current mobile DTO. Use one batched query, never N+1. Include revision in DTO and event payload.

## P2-S8 Surface limits/spawn
Apply objects-per-surface atomically. Bound metadata bytes/keys and reserved keys. Add concurrent-create tests against unique cell constraints.

## P2-S9 GC
Delete unconfirmed uploads older than 24h and unused pixel sheets older than 7d, excluding referenced revisions. Dry-run, metrics, retry and rollback documentation.

## P2-S10 Idempotency
Use existing idempotency service for upload, submit/resubmit and surface create. Persist response or deterministic resource identity.

## P2-S11 Preview
Generate preview at submit from static frame, store as media with relation, return previewUrl. Validate preview and clean it on failed transaction.

## P2-S12 Events
Emit revision-published event with object ID and revision. Clients can invalidate by revision; HTTP remains authority.

**Exit gate:** migration verify passes, no invalid FK backfill, live resubmit preserves old placements.
