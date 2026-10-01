# 90. Status Board

Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `VERIFY`. Every agent updates its row in its PR. Do not mark DONE without evidence.

| Story | Repo | Depends on | Status | Owner | Evidence |
|---|---|---|---|---|---|
| P0-S1..S5 | API | 01,05,06 | TODO | - | - |
| P0-S6 | PG | P0-S4,S5 | TODO | - | - |
| P0-S7 | MOB | P0-S4,S5 | TODO | - | - |
| P1-S1..S10 | API | P0-S5; P1-S1->S2->S3 | TODO | - | - |
| P2-S1..S12 | API | P0, P1 as index | TODO | - | - |
| P3-S1..S6 | PG | P0, P2 | TODO | - | - |
| P4-S1..S12 | MOB | P0, P2 | TODO | - | - |
| P5-S1..S6 | all | P1..P4 | TODO | - | - |

## Required handoff fields

- branch and PR URL
- exact files and migration IDs
- commands/tests with result
- contract/ADR touched
- rollback plan
- known follow-up and unblocked story
