# Test Checklist

Tracks automated and manual acceptance criteria by phase, with evidence/result.

## Phase 0 — Environment and repository readiness

| #   | Criterion                                                                  | Type      | Result  | Evidence                                         |
| --- | -------------------------------------------------------------------------- | --------- | ------- | ------------------------------------------------ |
| 0.1 | Git, Node.js LTS, pnpm, Docker installed and verified                      | Manual    | Pass    | Terminal output confirmed versions               |
| 0.2 | Git repo + pnpm workspace initialized, first commit made                   | Manual    | Pass    | Commit 83a67e1                                   |
| 0.3 | TypeScript strict config, ESLint, Prettier, commitlint pass with no errors | Automated | Pass    | `pnpm run typecheck/lint/format:check` all clean |
| 0.4 | Docker Compose stack (postgres, redis, minio, mailpit) all healthy         | Manual    | Pass    | `docker compose ps` — all (healthy)              |
| 0.5 | `.gitignore` complete, no secrets/generated files tracked                  | Manual    | Pass    | `git ls-files` grep returned empty               |
| 0.6 | Core docs (PROJECT_STATE, DECISIONS, CHANGELOG, TEST_CHECKLIST) scaffolded | Manual    | Pending | This step                                        |

## Phase 1 — Authentication, organization, users, authorization

(Not started)
