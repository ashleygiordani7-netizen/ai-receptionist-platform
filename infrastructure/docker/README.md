# infrastructure/docker

Dockerfiles and any shared container-build configuration for each
independently deployable service (`apps/dashboard`, `apps/api`,
`apps/webhooks`, `apps/workers`).

## Rules

- One Dockerfile per app, kept here rather than scattered across `apps/*`,
  so build configuration for all services is discoverable in one place.
- Images are built per-app so a change to one service doesn't require
  rebuilding/redeploying the others.

## Status

`Dockerfile.api` and `Dockerfile.dashboard` exist — both apps have real,
runnable code. `apps/webhooks` and `apps/workers` remain deferred until they
have actual runtime code worth containerizing (both are still `export {}`
placeholders); their Dockerfiles land alongside whichever milestone gives
each one a real entry point.

CI builds both images on every push/PR (`.github/workflows/ci.yml`) to catch
a broken Dockerfile early. Nothing is pushed to a registry yet — there isn't
one provisioned. That, and actual deployment, are later milestone work.

Both Dockerfiles use `turbo prune --docker` (Turborepo's own documented
pattern for building a single app out of a monorepo) rather than installing
the whole workspace — `turbo` is already a root devDependency, so this adds
nothing new.
