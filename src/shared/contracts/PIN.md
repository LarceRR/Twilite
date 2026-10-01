# Contracts pin (P0-S7)

Pinned source: `@twilite/contracts@1.0.0` in `D:/twilite-backend/packages/contracts`.

## Why not `file:` dependency

A `file:../twilite-backend/packages/contracts` dependency is fragile on Windows (path layout, pnpm linking, Zod peer pull into Expo Metro). Until the package is published or a monorepo workspace exists, MOB vendors the **client-facing surface** lightly (ADR-001 Option B):

- error code registry (`errors.ts`)
- default limits + format literal (`limits.ts`)

Zod schemas stay API-owned. MOB uses lightweight runtime parsers for DTO boundaries and still treats **server responses** as authoritative.

## Drift check

When bumping the pin, diff:

- `packages/contracts/src/errors.ts` → `src/shared/contracts/errors.ts` (codes array)
- `packages/contracts/src/limits.ts` → `src/shared/contracts/limits.ts` (DEFAULT_PIXEL_OBJECT_LIMITS)
