# 07. Agent Operating Manual

## Before coding

Read `00-INDEX`, this file, `04-CONTRACTS`, `06-ADR-LOG`, then the assigned phase/story. Inspect the current target branch; do not trust the audit pack over code when they conflict. If evidence is missing, add a `VERIFY` task and a test, not a guessed fix.

## Story protocol

1. Claim one story in `90-STATUS-BOARD.md` with agent name, repo, branch and timestamp.
2. Create a focused branch from the current integration base.
3. Implement the smallest vertical slice, including tests and migration/backfill if relevant.
4. Run the repo's verify command and targeted tests. Never disable lint/typecheck to pass.
5. Update status with files changed, commands run, evidence, risks and next dependency.
6. Open a PR; no direct merge by an agent.

## Non-negotiables

- Never weaken server validation because a client is inconvenient.
- Never change a contract, limit, error code, schema or ADR silently.
- Never log JWT, cookies, presigned URLs, raw user content or sheet bytes.
- Never accept a storage object as ready without ownership and HEAD verification.
- Never make a published revision disappear during resubmit.
- Never allocate/delete GL buffers inside the sprite loop.
- Preserve old clients during the compatibility window.

## Definition of Done

Code, tests, docs, telemetry, migration and rollback notes are complete. A story is not done if only TypeScript compiles. For API stories include authorization tests and an integration test. For PG/MOB stories include the relevant fixture test and error/loading/retry state. For performance stories include a measurable benchmark or device trace.

## Report format

```md
## STORY-ID result
Status: DONE | BLOCKED | VERIFY
Repo / branch:
Files:
Behavior changed:
Tests and commands:
Evidence / links:
Migration and rollback:
Known risks:
Next unblocked story:
```

## Stop and escalate

Stop before code if two interpretations of an ADR are plausible, if a migration could delete or hide user content, if the requested change needs a breaking API, or if the target file is not present. Record the exact question in the status board; do not invent an answer inside implementation.
