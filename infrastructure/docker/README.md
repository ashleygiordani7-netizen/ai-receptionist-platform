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

Empty. No Dockerfiles exist yet — deliberately deferred until each app has
actual runtime code worth containerizing. Introduced alongside the
foundational platform milestone's CI/CD work.
