# Nexora Desk — Project State

## Current phase and step

Phase 0 — Environment, repository, and local infrastructure
Step 0.6 — Documentation scaffolding (in progress)

## Last verified Git commit

1c42319 — chore: expand .gitignore for local overrides, IDE folders, and key files

## Working features

- Git repository initialized on `main`
- pnpm workspace skeleton (`apps/`, `packages/`)
- Root TypeScript strict base config, ESLint, Prettier, commitlint/husky
- Docker Compose stack: PostgreSQL 18, Redis 8, MinIO, Mailpit — all healthy

## Current commands

- `pnpm run lint` — lint the repo
- `pnpm run format` / `format:check` — format check
- `pnpm run typecheck` — placeholder until first real package exists
- `docker compose up -d` — start local infra
- `docker compose ps` — check container health

## Local URLs

- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001
- Mailpit UI: http://localhost:8025

## Database migration status

No schema/migrations yet — Prisma setup begins in Phase 1.

## Tests passing/failing

No tests yet — no application code exists.

## Open issues

None currently blocking.

## Decisions made

See `docs/DECISIONS.md`:

- Pinned TypeScript to 6.0.3 (typescript-eslint compatibility)
- Root tsconfig renamed to tsconfig.base.json (non-buildable base config)
- PostgreSQL 18 volume mount path fix

## Exact next step

Phase 0, Step 0.6 (continued) — finish docs/CHANGELOG.md and docs/TEST_CHECKLIST.md, then commit. After that: Phase 1 — Authentication, organization, users, and authorization.
