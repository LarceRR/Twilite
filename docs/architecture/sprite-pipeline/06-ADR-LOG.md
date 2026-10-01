# 06. ADR Log

## ADR-001: Shared contracts package (Accepted)
**Decision:** API owns `@twilite/contracts`; all repos consume it plus golden fixtures. **Why:** hand-copied schemas already drift. **Rejected:** keep copies, because CI cannot prove semantic parity.

## ADR-002: 160px canonical canvas (Accepted)
**Decision:** catalog max is 160x160. PG may edit/import up to 1024 only as an unsent working document and must offer nearest downscale or crop. **Why:** API and GPU budgets.

## ADR-003: Immutable revisions (Accepted)
**Decision:** every submit/resubmit creates a revision; current published revision remains live until replacement is published. **Why:** no blank placements during moderation and deterministic rollback.

## ADR-004: First-class placement FK (Accepted)
**Decision:** add nullable `surface_objects.pixel_object_id` FK; reject unknown/unpublished at create; reserve metadata key; PATCH cannot alter it. **Why:** integrity belongs to server. Nullable preserves procedural kinds.

## ADR-005: Confirm verifies storage (Accepted)
**Decision:** owner-scoped confirm performs R2 HEAD and exact content checks. **Why:** ready must mean bytes exist and match ticket.

## ADR-006: Public pixel sheets (Accepted)
**Decision:** pixel sheets remain publicly readable after publish; use opaque keys, avoid user IDs, do not promise revocation. **Why:** CDN performance and catalog design. Voice/attachments are a separate privacy track.

## ADR-007: Archive, do not hard-delete catalog heads (Accepted)
**Decision:** archive removes catalog visibility but does not break existing placements. **Why:** stable rendering and moderation recovery.

## ADR-008: Bounded mobile texture cache (Accepted)
**Decision:** 32 unique textures or 48 MiB estimate, LRU eviction, URL+revision key. **Why:** predictable low-end behavior.

## ADR-009: Respect reduceMotion (Accepted)
**Decision:** show staticPreviewFrame and stop RAF when enabled/backgrounded. **Why:** accessibility and battery.

## ADR-010: Placeholder for unbound surface objects (Accepted)
**Decision:** Fire/Cloud without pixel binding render a built-in placeholder. **Why:** old data and procedural fallback remain valid.

## ADR-011: Canonical sheet grid (Accepted)
**Decision:** row-major, `columns=ceil(sqrt(frameCount))` from PG; backend accepts any valid grid but enforces cells and dimensions. **Why:** deterministic packer without overcoupling clients.

## ADR-012: Idempotent writes (Accepted)
**Decision:** upload ticket, submit, resubmit and surface create accept `Idempotency-Key`; same key+same payload returns same result, changed payload conflicts. **Why:** retries are normal.

## ADR-013: Surface capacity is enforced (Accepted)
**Decision:** atomic count/check at create, return `SURFACE_FULL`. **Why:** spawn algorithm otherwise grows unbounded.

## ADR-014: Account deletion treatment (Proposed, requires privacy review)
**Decision:** do not cascade-delete published catalog bytes blindly; anonymize author display and retain published revision only if legally allowed. **Why:** existing placements. Must be confirmed with legal/product owner before implementation.

## ADR-015: Compatibility window (Accepted)
**Decision:** one mobile release window dual-reads metadata and `/mobile`; then telemetry confirms cutover before removal. **Why:** staged deployments.

## ADR-016: Server preview (Accepted)
**Decision:** generate a small static preview at validation time. **Why:** catalog cards should not allocate GL contexts.
