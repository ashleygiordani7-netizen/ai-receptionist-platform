# AI Receptionist Platform

A production-grade, multi-tenant SaaS platform for AI phone receptionists.
Vapi provides voice/telephony execution only; this platform owns all
business logic, tenant configuration, prompt management, analytics, call
history, and third-party integrations.

**Source of truth for architecture and sequencing:**
- [`docs/TDD.md`](./docs/TDD.md) — the Technical Design Document
- [`docs/MILESTONE-ROADMAP.md`](./docs/MILESTONE-ROADMAP.md) — the milestone-by-milestone build plan
- [`CLAUDE.md`](./CLAUDE.md) — the engineering rules every change in this repo must follow

If you're an AI assistant or a new contributor working in this repo, read
`CLAUDE.md` first. It is not optional context — it defines the layering,
multi-tenancy, security, and testing rules that apply to every change.

## Current status

This repository currently contains **project scaffolding only** — folder
structure, tooling configuration, and placeholder packages/apps. No
business logic, database schema, authentication, API endpoints, UI
components, or Vapi integration exists yet. Each of those is introduced by
its corresponding milestone in `docs/MILESTONE-ROADMAP.md`, in order.
Nothing is built ahead of the milestone that calls for it.

## Repository structure

```
apps/
  dashboard/        Customer-facing web app (Next.js). Talks only to apps/api.
  api/               Core backend API. Owns all business logic and DB access.
  webhooks/          Dedicated inbound-webhook ingestion service (Vapi, Stripe, etc).
  workers/           Background job processors (queue consumers).

packages/
  ui/                Shared design system (presentational components only).
  auth/              Authentication + RBAC authorization policy engine.
  database/          The only package that talks to PostgreSQL. Schema, migrations, repositories.
  types/             Shared DTOs / Zod schemas used by both frontend and backend.
  config/            Shared ESLint, TypeScript, and Tailwind presets.
  logger/            Structured, tenant-aware logging used by every app.
  queue/             Shared queue definitions and job payload contracts.
  vapi/              The only package that talks to Vapi. All Vapi calls go through here.
  integrations/       Adapters for calendar/CRM/SMS/payments providers, behind a common interface.
  prompt-engine/     Deterministic prompt template + variable composition/rendering.
  analytics/          Aggregation/rollup logic for tenant-facing analytics and reporting.
  shared/            Small, genuinely cross-cutting utilities with no business logic.

infrastructure/
  terraform/          Infrastructure as Code (VPC, RDS, Redis, S3, ECS, etc).
  docker/            Per-app Dockerfiles and container build configuration.

docs/
  TDD.md               The Technical Design Document.
  MILESTONE-ROADMAP.md  The milestone plan.
  adr/                  Architecture Decision Records (one file per significant decision).

scripts/             One-off/repeatable developer and ops scripts.
.github/workflows/   CI pipelines.
```

Every package and app currently contains only a `package.json`, `tsconfig.json`,
a placeholder entry file (or, for `apps/dashboard`, a minimal buildable
Next.js shell), and a `README.md` explaining its intended purpose and the
architectural rules specific to it. Read a package's own `README.md` before
working in it — it documents constraints (e.g. "only this package may import
the Vapi SDK") that apply specifically there.

## Why this structure

- **One-way dependency flow.** Apps depend on packages; packages don't
  depend on apps. Within an app, dependencies point downward: Controller →
  Application Service → Domain Service → Repository → Database (see
  `CLAUDE.md`'s Architecture Principles). No layer reaches back up.
- **External providers are isolated to exactly one package each.**
  `@platform/vapi-client` is the only place the Vapi SDK is imported anywhere in
  this codebase; `@platform/integrations` plays the same role for calendar/
  CRM/SMS/payment providers. This is what makes Vapi "replaceable" in
  practice, not just in principle — swapping or adding a provider is
  contained to one package.
- **The dashboard never talks to a third party directly**, including Vapi.
  Every external call is proxied through `apps/api`, which is the only
  application allowed to invoke `@platform/vapi-client` or `@platform/integrations`.
- **Business configuration and AI configuration are separate concerns**
  from the schema up — this is why there isn't a single generic "settings"
  package or table; the two are modeled, versioned, and iterated on
  independently, per the Milestone Roadmap.
- **Long-running or externally-dependent work never blocks a request.**
  `@platform/queue` and `apps/workers` exist so that anything touching an
  external provider, doing AI processing, or handling a webhook is
  asynchronous, retryable, and idempotent by construction.

## Working in this repository

1. **Read the milestone you're implementing** in `docs/MILESTONE-ROADMAP.md`
   before writing any code. Implement only that milestone's Goal, Features,
   and Definition of Done — not future milestones, even if the temptation to
   "just add it while I'm here" comes up.
2. **Check the relevant package/app README** for constraints specific to
   where you're working.
3. **Follow `CLAUDE.md`** for engineering rules: layering, multi-tenancy,
   auth, testing, security, and code quality. If a task seems to require
   deviating from it, explain the tradeoff and get agreement before
   proceeding, and record the decision in `docs/adr/` if it's significant.
4. **Every tenant-owned table/record is scoped by `organization_id`,
   enforced at the database layer (Row-Level Security) in addition to the
   application layer.** This is non-negotiable and is tested explicitly for
   every tenant-aware feature (see `CLAUDE.md`'s Multi-Tenant Testing
   section).
5. **Vapi (and every other external provider) is never called synchronously
   from a config-save path.** Save to the database first, return success,
   then sync asynchronously via a queued job. The one deliberate exception
   is a genuinely latency-bound, in-call action (e.g. a live function/tool
   call during an active phone call) — that path is synchronous because
   it's part of a live conversation, not a settings change.

## Getting started

```bash
pnpm install       # install all workspace dependencies
pnpm dev           # run all apps in development mode (via Turborepo)
pnpm build         # build all apps and packages
pnpm lint          # lint all apps and packages
pnpm typecheck     # typecheck all apps and packages
pnpm test          # run all tests
```

`pnpm install` also sets up a pre-commit hook (via husky + lint-staged) that
runs ESLint and Prettier on staged files — this requires a git repository to
attach to, so it takes effect after `git init` (or on a fresh clone), not
before.

**pnpm is the only supported package manager.** It's what CI uses,
`pnpm-lock.yaml` is the only lockfile committed to the repo, and a
`preinstall` guard (`only-allow pnpm`) will refuse to run if you try
`npm install` or `yarn install` — this is deliberate, not a bug: it exists
specifically to prevent the confusing partial-install behavior that happens
when a different package manager tries to resolve this workspace. Install
pnpm via `corepack enable && corepack prepare pnpm@9 --activate` if you
don't have it.

To run just the dashboard (currently the only app with a real dev server):

```bash
pnpm --filter @platform/dashboard dev
```

`apps/api`, `apps/webhooks`, and `apps/workers` don't have a runnable server
yet — their `dev` script is a placeholder until the milestone that adds
real endpoints/handlers.

Copy `.env.example` to `.env` and fill in local values before running
anything that depends on a database, cache, or external provider — none of
which exist yet at this stage of the project.
