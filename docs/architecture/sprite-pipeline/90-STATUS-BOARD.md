# 90. Status Board

Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `VERIFY`. Every agent updates its row in its PR. Do not mark DONE without evidence.

| Story | Repo | Depends on | Status | Owner | Evidence |
|---|---|---|---|---|---|
| P0-S1 | API/docs | 01,05,06 | DONE | Auto (Composer) | ADR-001..016 Accepted. ADR-014: anonymize author as `DELETED`, retain published catalog bytes (Maku 2026-10-01). |
| P0-S2 | API | P0-S1 | DONE | Auto (Composer) | `@twilite/contracts@1.0.0` in `packages/contracts`; API re-exports pixel/media contracts; workspace + build + stale check |
| P0-S3 | API | P0-S2 | IN_PROGRESS | Auto (Composer) | Golden JSON fixtures + fixture tests; PNG adversarial fixtures still TODO |
| P0-S4 | API | P0-S3 | IN_PROGRESS | Auto (Composer) | npm workspaces + CI build/check:contracts + Dockerfile copies packages; npm publish not wired (private) |
| P0-S5 | API | P0-S2 | DONE | Auto (Composer) | `GET /tpg/pixel-objects/limits`; MEDIA_* error codes in AppError + contracts registry |
| P0-S6 | PG | P0-S4,S5 | TODO | - | after package pin |
| P0-S7 | MOB | P0-S4,S5 | TODO | - | after package pin |
| P1-S1 | API | - | DONE | Auto (Composer) | `ConfirmMediaUploadService` owner-scoped confirm + 404; tests owned/foreign/missing/idempotent |
| P1-S2 | API | P1-S1 | DONE | Auto (Composer) | `StoragePort.headObject` + R2 HeadObject; confirm verifies size/type; reject+delete; FakeStorage tests |
| P1-S3 | API | P1-S2 | TODO | Auto (Composer) | bounded getObject next |
| P1-S4 | API | P0-S5 | TODO | Auto (Composer) | - |
| P1-S5..S10 | API | see index | TODO | Auto (Composer) | - |
| P2-S1 | API | P0-S2 | DONE | Auto (Composer) P2/P3 | `0008_pixel_object_revisions.sql`; Drizzle `pixelObjectRevisions`; head pointers; backfill helpers+schema-contract; vitest 116 |
| P2-S2 | API | P2-S1, P1-S3 | BLOCKED | Auto (Composer) P2/P3 | waiting on P1-S3 bounded getObject |
| P2-S3 | API | P2-S2 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 |
| P2-S4 | API | P2-S2 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 |
| P2-S5 | API | P2-S2 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 |
| P2-S6 | API | P2-S2 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 |
| P2-S7 | API | P2-S6 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S6 |
| P2-S8 | API | P0-S5 | BLOCKED | Auto (Composer) P2/P3 | after P2-S2 preferred |
| P2-S9 | API | P1-S2 | BLOCKED | Auto (Composer) P2/P3 | after P2-S2 preferred |
| P2-S10 | API | P2-S2 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 |
| P2-S11 | API | P2-S2 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 |
| P2-S12 | API | P2-S7 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S7 |
| P3-S1 | PG | P0-S6, P2-S4 | BLOCKED | Auto (Composer) P2/P3 | waiting on P0-S6 + P2-S4 |
| P3-S2 | PG | - | DONE | Auto (Composer) P2/P3 | `selectActiveExportFrame` + EditorExport uses active frame; vitest 5 passed |
| P3-S3 | PG | P0-S6, P2-S10 | BLOCKED | Auto (Composer) P2/P3 | waiting on P0-S6 + P2-S10 |
| P3-S4 | PG | P2-S2, P3-S3 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S2 + P3-S3 |
| P3-S5 | PG | P2-S4 | BLOCKED | Auto (Composer) P2/P3 | waiting on P2-S4 |
| P3-S6 | PG | P0-S5 | BLOCKED | Auto (Composer) P2/P3 | waiting on P0-S6 consume preferred |
| P4-S1..S12 | MOB | P0, P2 | TODO | - | - |
| P5-S1..S6 | all | P1..P4 | TODO | - | - |

## Active agent notes

### Agent A — Phase 0 + 1 (API)
- **Claimed:** Phase 0 (S1–S5) + Phase 1 (S1–S10) on API
- **Branch:** `feat/sprite-pipeline-p0-p1` @ `D:/twilite-backend`
- **Started:** 2026-10-01
- **Blocker:** none (G0 ADR gate clear).
- **Next:** P1-S3 bounded getObject; finish P0-S3 PNG fixtures; P1-S5..S10
- **Note:** account-deletion implementation must follow ADR-014 (tombstone `DELETED`, no cascade of published sheets).

### Agent B — Phase 2 + 3 (API domain + PG)
- **Claimed:** Phase 2 (S1–S12) + Phase 3 (S1–S6)
- **Branches:** `feat/sprite-pipeline-p2` @ `D:/twilite-backend`; `feat/sprite-pipeline-p3` @ `D:/twilite-pg`
- **Started:** 2026-10-01
- **Wave A done:** P2-S1 (revisions schema + backfill), P3-S2 (active-frame export)
- **Parked:** P2-S2..S12 blocked on P1-S3 (then sequential); P3-S1/S3–S6 blocked on P0-S6 and/or P2 slices
- **Unblocks next:** P1-S3 → P2-S2; P0-S6 + P2-S4/S10 → P3 authoring stories
- **Rollback P2-S1:** drop head revision FKs, drop `pixel_object_revisions`, drop pointer columns; head columns remain authoritative until P2-S2
- **Note:** do not rewrite submit/resubmit until P2-S2; dual-write head columns remain after P2-S1

## Required handoff fields

- branch and PR URL
- exact files and migration IDs
- commands/tests with result
- contract/ADR touched
- rollback plan
- known follow-up and unblocked story
