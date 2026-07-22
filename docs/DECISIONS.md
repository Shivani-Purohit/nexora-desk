# Architectural Decisions

## 2026-07-22 — Pin TypeScript to 6.0.3 instead of latest (7.x)

**Status:** Accepted

**Context:** `pnpm add typescript` resolved to TypeScript 7.0.2, a new major
release built on the Go-based "Corsa" compiler. `typescript-eslint@8.65.0`
only supports TypeScript `>=4.8.4 <6.1.0` as of this date.

**Decision:** Pin `typescript` to `6.0.3`, the latest release in the 6.0.x
line and the newest version still fully compatible with typescript-eslint.

**Alternatives considered:** Using TypeScript 7.x and waiting for
typescript-eslint to add support — rejected, as it would block linting
entirely for an unknown period.

**Consequences:** Revisit this pin once typescript-eslint publishes a
release supporting TypeScript 7.x.

**Reversal conditions:** typescript-eslint adds TS 7.x support in a stable release.

---

## 2026-07-22 — Root tsconfig is a non-buildable base config

**Status:** Accepted

**Context:** The root `tsconfig.json` was intended as a shared base for
per-package configs, but `tsc --noEmit` at the root failed since it isn't
tied to any actual source files yet.

**Decision:** Renamed the file to `tsconfig.base.json` (not run directly by
`tsc`). The root `typecheck` script is a placeholder until real packages
exist under `apps/*` and `packages/*`, each with their own `tsconfig.json`
extending `../../tsconfig.base.json`.

**Consequences:** Update the root `typecheck` script once the first real
package (e.g. `apps/api`) is created in a later phase, so it type-checks
that package instead of printing a placeholder.

**Reversal conditions:** N/A — this is the standard monorepo pattern going forward.

---

## 2026-07-22 — PostgreSQL 18 volume mount path change

**Status:** Accepted

**Context:** PostgreSQL 18's official Docker image changed its expected
data directory layout. Mounting a volume directly at
`/var/lib/postgresql/data` (the pre-18 convention) causes the container to
detect a "mismatched" layout and refuse to start, restarting in a loop.

**Decision:** Mount the `postgres_data` volume at `/var/lib/postgresql`
instead (one level up); the image manages the version-specific
subdirectory internally.

**Consequences:** Any future PostgreSQL major-version upgrade should be
done via `pg_upgrade`, not a plain image tag bump, per the image's own
documentation.

**Reversal conditions:** N/A — this matches the current official image's
required layout.
