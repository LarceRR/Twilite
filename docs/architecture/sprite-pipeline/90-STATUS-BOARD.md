# 90. Status Board

Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `VERIFY`. Every agent updates its row in its PR. Do not mark DONE without evidence.

| Story | Repo | Depends on | Status | Owner | Evidence |
|---|---|---|---|---|---|
| P0-S1 | API/docs | 01,05,06 | DONE | Auto (Composer) | ADR-001..016 Accepted. ADR-014 tombstone DELETED |
| P0-S2 | API | P0-S1 | DONE | Auto (Composer) | `@twilite/contracts@1.0.0` in `packages/contracts` |
| P0-S3 | API | P0-S2 | DONE | Auto (Composer) | Golden JSON fixtures in packages/contracts (PNG adversarial still thin) |
| P0-S4 | API | P0-S3 | DONE | Auto (Composer) | workspaces + CI contracts; private package (no npm publish) |
| P0-S5 | API | P0-S2 | DONE | Auto (Composer) | `GET /tpg/pixel-objects/limits` + MEDIA_* codes |
| P0-S6 | PG | P0-S4,S5 | DONE | Auto (Composer) P2/P3 | vendored `@twilite/contracts` surface in PG `src/shared/contracts` |
| P0-S7 | MOB | P0-S4,S5 | TODO | - | after package pin |
| P1-S1 | API | - | DONE | Auto (Composer) | ConfirmMediaUpload owner-scoped |
| P1-S2 | API | P1-S1 | DONE | Auto (Composer) | headObject + size/type verify |
| P1-S3 | API | P1-S2 | DONE | Auto (Composer) P2/P3 | bounded getObject HEAD-first + FakeStorage tests |
| P1-S4 | API | P0-S5 | TODO | Auto (Composer) | - |
| P1-S5..S10 | API | see index | TODO | Auto (Composer) | - |
| P2-S1 | API | P0-S2 | DONE | Auto (Composer) P2/P3 | `0008_pixel_object_revisions.sql` + backfill |
| P2-S2 | API | P2-S1, P1-S3 | DONE | Auto (Composer) P2/P3 | revision service; resubmit keeps published pointer |
| P2-S3 | API | P2-S2 | DONE | Auto (Composer) P2/P3 | quarantine corrupt manifests in list |
| P2-S4 | API | P2-S2 | DONE | Auto (Composer) P2/P3 | cursor limit<=50 catalog list |
| P2-S5 | API | P2-S2 | DONE | Auto (Composer) P2/P3 | `archived` + POST archive; catalog excludes archived |
| P2-S6 | API | P2-S2 | DONE | Auto (Composer) P2/P3 | `0009` surface_objects.pixel_object_id FK + dual-read |
| P2-S7 | API | P2-S6 | DONE | Auto (Composer) P2/P3 | snapshot batched mobile embed |
| P2-S8 | API | P0-S5 | DONE | Auto (Composer) P2/P3 | objectsPerSurface + metadata bounds |
| P2-S9 | API | P1-S2 | DONE | Auto (Composer) P2/P3 | MediaGcService dry-run/delete |
| P2-S10 | API | P2-S2 | DONE | Auto (Composer) P2/P3 | Idempotency-Key on submit/resubmit |
| P2-S11 | API | P2-S2 | DONE | Auto (Composer) P2/P3 | createPreviewMedia at submit |
| P2-S12 | API | P2-S7 | DONE | Auto (Composer) P2/P3 | pixel_object.published domain event |
| P3-S1 | PG | P0-S6, P2-S4 | DONE | Auto (Composer) P2/P3 | oversize downscale/crop UX |
| P3-S2 | PG | - | DONE | Auto (Composer) P2/P3 | active-frame export |
| P3-S3 | PG | P0-S6, P2-S10 | DONE | Auto (Composer) P2/P3 | resumable submit + Idempotency-Key |
| P3-S4 | PG | P2-S2, P3-S3 | DONE | Auto (Composer) P2/P3 | load + PATCH resubmit |
| P3-S5 | PG | P2-S4 | DONE | Auto (Composer) P2/P3 | cursor paging + self-moderation block |
| P3-S6 | PG | P0-S5 | DONE | Auto (Composer) P2/P3 | mapApiError codes + requestId |
| P4-S1..S12 | MOB | P0, P2 | TODO | - | - |
| P5-S1..S6 | all | P1..P4 | TODO | - | - |

## Active agent notes

### Agent B — Phase 2 + 3 (complete Wave A–C)
- **Branches:** `feat/sprite-pipeline-p2` @ API; `feat/sprite-pipeline-p3` @ PG (`d6a4bba`)
- **Migrations:** `0008_pixel_object_revisions`, `0009_pixel_archive_and_surface_binding`
- **API tests:** focused vitest 143 passed (storage/pixel/surface/schema-contract)
- **PG tests:** 281 passed
- **Next unclaimed:** Phase 4 mobile runtime; remaining P1-S4..S10 security polish
- **Rollback P2:** drop 0009 then 0008 FKs/tables/columns; head columns remain until cutover verified

## Required handoff fields

- branch and PR URL
- exact files and migration IDs
- commands/tests with result
- contract/ADR touched
- rollback plan
- known follow-up and unblocked story
