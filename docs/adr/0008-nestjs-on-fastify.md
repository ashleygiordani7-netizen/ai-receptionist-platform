# ADR 0008: NestJS on the Fastify adapter for apps/api

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The TDD's tooling table (§2) explicitly leaves this undecided: "NestJS (or
Fastify if you want leaner)," and asks for an ADR once a choice is made
(`docs/TDD.md:779`), same pattern as ADR-0007's Prisma/Drizzle decision. M0
requires a base app with a health check endpoint (Milestone Roadmap M0)
before any real backend work begins.

CLAUDE.md's Backend Engineering layering is explicit and non-negotiable:
`Controller → Application Service → Domain Service → Repository → Database`,
with hard rules ("Controllers should only delegate," "never contain business
logic," "never call external providers"). That's exactly the shape NestJS's
module/controller/provider system and dependency-injection container are
built to enforce. Building the same discipline on raw Fastify would mean
hand-rolling a module/DI convention ourselves — the opposite of "avoid
unnecessary abstractions we'd have to invent."

There's also a concrete signal already in the roadmap, not just a stylistic
preference: M1's backend work says the auth policy engine will be "wired to
real **guards**," and `packages/auth/README.md` says its RBAC engine is
"consumed identically by backend **guards**." `Guard` (`CanActivate`) is a
specific NestJS primitive, not a generic word choice — the roadmap was
already written assuming NestJS.

## Decision

Use NestJS (`@nestjs/core`, `@nestjs/common`) as `apps/api`'s framework,
running on Fastify via `@nestjs/platform-fastify` rather than NestJS's
default Express adapter. This isn't "NestJS vs. Fastify" — it's NestJS's
structure and DI running on top of Fastify's HTTP engine, which is a
directly supported adapter swap, not a workaround.

## Alternatives considered

- **Raw Fastify**: rejected — CLAUDE.md's layered architecture and
  "Controllers should only delegate" rule would have to be enforced entirely
  by convention/code review, with no framework support (no DI container, no
  guard/interceptor primitives) — exactly the kind of ad hoc infrastructure
  the platform's own principles argue against building ourselves when a
  well-established alternative exists.
- **NestJS on Express (the default adapter)**: rejected — no reason to give
  up Fastify's performance when `@nestjs/platform-fastify` provides the same
  structural benefits without that trade-off.

## Consequences

- `apps/api` gains its first real dependencies: `@nestjs/core`,
  `@nestjs/common`, `@nestjs/platform-fastify`, `fastify`,
  `reflect-metadata`, `rxjs` (the last two are hard Nest requirements, not
  optional extras — decorators and DI don't function without them).
- `apps/api/tsconfig.json` gains `experimentalDecorators`/
  `emitDecoratorMetadata`, scoped to this app only (not
  `tsconfig.base.json`), since only Nest's decorators need them.
- Future milestones that add real modules (auth guards in M1, business
  profile/AI config CRUD in M2/M3, etc.) build on this same
  controller/service/module shape rather than deciding it per-feature.
