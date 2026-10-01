# Phase 1: Backend Security

## P1-S1 Confirm ownership
Add CurrentUser, owner-scoped update and 404 response. Tests: owner success, foreign asset 404, missing asset 404, repeat confirm.

## P1-S2 R2 HEAD
Extend `StoragePort` with bounded `headObject`. Verify existence, exact declared byte size and allowed content type before ready. On mismatch mark rejected and best-effort delete. Add fake storage tests.

## P1-S3 Bounded reads
Never call `getObject` for bytes over kind limit. Use HEAD first, then bounded stream/read. Sharp must receive only accepted bytes and enforce pixel/decode limits.

## P1-S4 Media policy/quota
Create one kind policy registry: content types, size, privacy, retention. Apply daily per-user quota transactionally. Add pending ticket expiry job and metrics.

## P1-S5 Authz/throttle
Wire documented media/tpg permissions; keep space permissions separate. Add throttles to ticket, confirm, submit, pixelate and moderation routes. Add tests for missing permissions and 429.

## P1-S6 Opaque keys
Stop exposing user ID in future storage keys. Keep legacy reads. Document public pixel URL semantics and do not log URLs.

## P1-S7 Param validation
All ID route params use UUID schema/pipe. Invalid input is 400 and cannot reach repository.

## P1-S8 Moderation controls
Prevent self-moderation unless explicit admin override; record reviewer, revision and decision in audit log. Make review idempotent and state-guarded.

## P1-S9 Sharp hardening
Verify non-animated PNG, dimensions, alpha and decode limits with adversarial fixtures. Benchmark 8 MiB input and fail safely.

## P1-S10 SSRF review
Trace pixelate redirects, DNS resolution and private IPv4/IPv6 ranges. Add redirect revalidation, timeout, response-size cap and tests for rebinding/private targets.

**Exit gate:** SEC-01..SEC-05 closed, security regression green, no unbounded media read.
