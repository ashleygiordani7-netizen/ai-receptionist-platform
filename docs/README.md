# docs

- `TDD.md` — the Technical Design Document. Source of truth for all
  architectural decisions.
- `MILESTONE-ROADMAP.md` — the milestone-by-milestone build plan. Source of
  truth for what is in scope right now versus what belongs to a future
  milestone.
- `adr/` — Architecture Decision Records. Any time an implementation
  decision deviates from, or adds detail beyond, what's written in the TDD
  (e.g. choosing Drizzle over Prisma, or Fastify over NestJS), record the
  decision and its reasoning here rather than letting it live only in a
  pull request description.

If a proposed change conflicts with `TDD.md` or `MILESTONE-ROADMAP.md`,
resolve the conflict explicitly (update the doc, or don't make the change)
rather than letting code and docs silently drift apart.
