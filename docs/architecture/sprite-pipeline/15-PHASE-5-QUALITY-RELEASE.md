# Phase 5: Quality and Release

## P5-S1 API E2E
With Postgres and S3-compatible storage: upload, confirm, submit, reject, resubmit, publish, place, snapshot, realtime and archive. Assert old revision remains live during resubmit.

## P5-S2 Security regression
Automate SEC-01..SEC-05: cross-user confirm, missing/wrong object, oversize, quota, route authz, SSRF cases, self-moderation and log redaction.

## P5-S3 Observability
Dashboards/alerts for confirm mismatch, invalid manifest, R2 errors, quota 429, catalog latency, texture failure rate, GL p95. Correlate requestId; redact secrets.

## P5-S4 Compatibility rollout
Deploy API additive schema and dual-read first, then PG/MOB consumers, then enable FK enforcement, then remove legacy after one mobile release window. Keep rollback migration and feature flag.

## P5-S5 Documentation sync
Update API OpenAPI, limits docs, mobile runbook, editor help, migration notes and this package. CI checks generated contracts/docs.

## P5-S6 Device performance
Test 1/10/32 unique sheets, 50/250/500 objects, cold/warm cache, 4G, background, context loss, reduceMotion, low memory. Capture p50/p95 and compare budgets.

**Release gate:** G0-G5 from index, all High/Critical findings closed, staging backfill verified, E2E and device traces green.
