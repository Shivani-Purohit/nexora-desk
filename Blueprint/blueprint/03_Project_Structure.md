# Nexora Desk - Project Structure

## Repository Structure

```
nexora-desk/
│
├── apps/
│   ├── api/                 # NestJS Backend
│   └── web/                 # Next.js Frontend
│
├── packages/
│   ├── ui/                  # Shared UI Components
│   ├── types/               # Shared TypeScript Types
│   ├── config/              # Shared Configurations
│   ├── eslint-config/
│   └── tsconfig/
│
├── blueprint/               # Project Documentation
│
├── docker/
│
├── scripts/
│
├── .github/
│
├── package.json
├── pnpm-workspace.yaml
└── docker-compose.yml
```

---

# Backend Structure

```
apps/api/src

auth/

users/

organizations/

customers/

tickets/

conversations/

channels/

ai/

knowledge-base/

reports/

notifications/

common/

config/
```

---

# Frontend Structure

```
apps/web

app/

components/

features/

hooks/

lib/

services/

types/

styles/
```

---

# Feature Based Architecture

Every business feature must contain:

- Controller
- Service
- DTOs
- Entities
- Validation
- Tests

Example

tickets/

controller

service

dto

entities

repository

tests

---

# Development Rules

- Every feature has its own module.
- Shared code belongs in packages.
- No duplicate components.
- Every API must be documented.
- Every UI screen must have a matching backend endpoint.
- Every feature requires unit tests.