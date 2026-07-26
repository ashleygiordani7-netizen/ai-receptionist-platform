# Technical Design Document
## Multi-Tenant AI Receptionist SaaS Platform

**Version:** 1.0
**Status:** Draft for team review
**Scope:** Platform architecture blueprint. Vapi is the voice/telephony execution layer only; this platform owns all business logic, tenancy, configuration, data, analytics, and integrations.

---

## 1. Overall System Architecture

### 1.1 Guiding principles

- **Vapi is a dumb pipe for voice.** It handles STT/TTS/telephony/turn-taking. Every decision of substance (what the assistant should say, what tools it can call, what data it can see, how a call is scored) is owned and versioned by our platform, not left inside Vapi's dashboard.
- **Tenant isolation by design, not by convention.** Every table, every query, every cache key, every queue message is tenant-scoped from day one, even though we start on shared infrastructure.
- **Config is data, not code.** Prompts, tool definitions, business hours, escalation rules, etc. are stored in our DB and rendered into Vapi assistant configs — never hand-edited in Vapi's UI per customer.
- **No request ever blocks on Vapi.** Every write path that touches Vapi (assistant config, prompt publish, phone number assignment, tool registration) follows the same shape: **Dashboard → API → Database (write + return success) → queued async job → Vapi.** The dashboard save button's success is defined entirely by the database write; Vapi synchronization is a separate, retryable, observable background step. If Vapi is down, slow, or rate-limiting us, customers can still edit and save their configuration — nothing is lost, and the sync simply catches up when Vapi is healthy again. See §9.6 for the mechanics.
- **Everything is event-sourced at the edges.** Calls, webhooks, and state transitions are appended as immutable events first; derived/aggregated views (dashboards, analytics) are built from those events. This gives us replayability, auditability, and resilience against Vapi schema changes.

### 1.2 High-level component diagram (described)

```
                         ┌─────────────────────────┐
                         │        Customers          │
                         │  (business owners, staff) │
                         └────────────┬─────────────┘
                                      │ HTTPS
                          ┌───────────▼────────────┐
                          │   Dashboard (Web App)   │  Next.js
                          └───────────┬────────────┘
                                      │ REST/GraphQL (JWT)
                    ┌─────────────────▼──────────────────┐
                    │         API Gateway / BFF            │
                    │  (auth, rate limit, tenant resolve)  │
                    └───────┬───────────────────┬─────────┘
                            │                   │
              ┌─────────────▼───┐     ┌─────────▼───────────┐
              │   Core API       │     │  Webhook Ingestion   │
              │  (business logic)│     │  Service (Vapi hooks)│
              └───┬─────────┬───┘     └─────────┬────────────┘
                  │         │                    │
      ┌───────────▼──┐  ┌───▼─────────┐   ┌──────▼───────────┐
      │  Primary DB   │  │  Cache/Queue │   │  Event Bus/Queue  │
      │ (Postgres,    │  │ (Redis)      │   │ (SQS/Kafka)       │
      │  RLS multi-   │  └──────┬───────┘   └──────┬────────────┘
      │  tenant)      │         │                  │
      └───────────────┘  ┌──────▼───────┐   ┌───────▼───────────┐
                          │ Async Workers │   │ Analytics Pipeline │
                          │ (transcripts, │   │ (ETL → warehouse)  │
                          │  scoring, KB  │   └────────────────────┘
                          │  sync, notif) │
                          └──────┬────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Object Storage (S3)      │
                    │  recordings, transcripts, │
                    │  KB docs, exports         │
                    └───────────────────────────┘

                    ┌───────────────────────────┐
                    │        Vapi Platform       │
                    │ (assistants, calls, STT/TTS│
                    │  telephony, function-calls)│
                    └──────────────┬─────────────┘
                                   │  Vapi Server SDK / REST + Webhooks
                    ┌──────────────▼─────────────┐
                    │   Vapi Integration Layer     │
                    │ (assistant provisioning,     │
                    │  tool/function bridge,       │
                    │  outbound call trigger)      │
                    └───────────────────────────────┘
```

### 1.3 Logical layers

1. **Presentation** – Dashboard (tenant admins/agents), public booking widgets, embeddable "call me" widgets.
2. **API/BFF layer** – Auth, tenant resolution, request validation, rate limiting, orchestration.
3. **Domain/service layer** – Core business logic: assistants, prompts, knowledge bases, scheduling rules, integrations, billing.
4. **Integration layer** – Vapi client, CRM connectors, calendar connectors, SMS/email providers.
5. **Data layer** – Postgres (system of record), Redis (cache/queues/session), S3 (blobs), warehouse (analytics).
6. **Async/event layer** – Webhook ingestion, background workers, event bus.
7. **Observability layer** – Logging, tracing, metrics, alerting — tenant-aware throughout.

---

## 2. Folder Structure

Monorepo, pnpm workspaces + Turborepo managed (see ADR-0002 — pnpm was briefly swapped for npm, then reverted; ADR-0002 explains why pnpm's stricter dependency isolation was judged worth the tooling overhead). This supports independent deployability while sharing types/schemas.

```
ai-receptionist-platform/
├── apps/
│   ├── dashboard/                 # Next.js customer-facing dashboard
│   │   ├── app/
│   │   │   ├── (auth)/            # login, signup, invite-accept
│   │   │   ├── (tenant)/[tenantId]/
│   │   │   │   ├── overview/
│   │   │   │   ├── assistant/
│   │   │   │   ├── calls/
│   │   │   │   ├── knowledge-base/
│   │   │   │   ├── integrations/
│   │   │   │   ├── analytics/
│   │   │   │   ├── billing/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── lib/
│   ├── admin/                     # Internal ops/superadmin console
│   ├── api/                       # Core API service (NestJS/Fastify)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenants/
│   │   │   │   ├── users/
│   │   │   │   ├── assistants/
│   │   │   │   ├── prompts/
│   │   │   │   ├── knowledge-base/
│   │   │   │   ├── calls/
│   │   │   │   ├── analytics/
│   │   │   │   ├── integrations/
│   │   │   │   ├── billing/
│   │   │   │   └── notifications/
│   │   │   ├── common/            # guards, interceptors, decorators
│   │   │   ├── config/
│   │   │   └── main.ts
│   ├── webhooks/                  # Dedicated webhook ingestion service
│   │   ├── src/
│   │   │   ├── vapi/
│   │   │   ├── stripe/
│   │   │   └── verification/
│   └── workers/                   # Background job processors
│       ├── src/
│       │   ├── jobs/
│       │   │   ├── transcript-processing/
│       │   │   ├── call-scoring/
│       │   │   ├── kb-embedding/
│       │   │   ├── analytics-rollup/
│       │   │   └── notification-dispatch/
│       │   └── queues/
├── packages/
│   ├── database/                   # Prisma/Drizzle schema, migrations (see ADR-0003 — renamed from "db")
│   ├── types/                      # Zod schemas + DTOs shared FE/BE (see ADR-0004 — split from "shared-types")
│   ├── shared/                     # Cross-cutting utilities with no domain meaning (see ADR-0004)
│   ├── vapi-client/                # Typed wrapper around Vapi API
│   ├── integrations/                # Adapters for every non-Vapi provider (see ADR-0006 — the §15 plugin-architecture home)
│   ├── prompt-engine/               # Prompt templating/versioning logic
│   ├── auth/                        # JWT/session helpers, RBAC policies
│   ├── queue/                       # Shared job/queue payload contracts (see ADR-0005)
│   ├── logger/                      # Shared structured logging (see ADR-0005)
│   ├── analytics/                   # Analytics aggregation/query logic (see ADR-0005)
│   ├── ui/                          # Shared design system components
│   └── config/                      # eslint, tsconfig, tailwind presets
├── infrastructure/                  # (named "infra/" in earlier drafts of this document)
│   ├── terraform/                  # IaC: VPC, RDS, ECS/EKS, S3, CDN
│   ├── docker/
│   └── k8s/ (if/when needed)
├── docs/
│   └── this TDD, ADRs, runbooks
└── turbo.json / package.json
```

---

## 3. Technology Stack Recommendations

| Layer | Recommendation | Notes |
|---|---|---|
| Language | TypeScript everywhere | Shared types across FE/BE/workers |
| Dashboard | Next.js (App Router) + React | SSR for fast dashboards, easy tenant routing |
| API | NestJS (or Fastify if you want leaner) | Modular, DI, good for large domain surface |
| DB | PostgreSQL (managed: RDS/Cloud SQL/Neon) | Row-Level Security for tenant isolation |
| ORM | Prisma or Drizzle | Drizzle if you want more raw SQL control at scale |
| Cache/Queue broker | Redis (ElastiCache) | Sessions, rate limiting, BullMQ queues |
| Job queue | BullMQ (Redis-backed) → later SQS/Kafka | Start simple, graduate as volume grows |
| Event bus (later) | Kafka or SQS/SNS | For analytics fan-out, integration events |
| Object storage | S3 (or R2) | Recordings, transcripts, KB source docs |
| Vector store | pgvector (Postgres) initially → Pinecone/Weaviate at scale | Knowledge base embeddings |
| Analytics warehouse | ClickHouse or BigQuery | Call events, aggregates, dashboards |
| Auth | Custom JWT + refresh tokens, or Clerk/Auth0/WorkOS for speed | SSO/SAML for enterprise tenants later |
| Voice provider | Vapi (server SDK + webhooks) | Abstracted behind our own interface |
| Search (KB, call transcripts) | Postgres full-text initially, OpenSearch at scale | |
| Observability | OpenTelemetry + Grafana/Tempo/Loki, or Datadog | Tenant ID as a tag on everything |
| Error tracking | Sentry | |
| Feature flags | Unleash/LaunchDarkly/GrowthBook | Per-tenant rollout of new assistant features |
| Infra | AWS (ECS Fargate to start, EKS later if needed) | Terraform IaC from day 1 |
| CDN | CloudFront/Fastly | Dashboard assets, public widgets |
| CI/CD | GitHub Actions → ECR → ECS/EKS | |

---

## 4. Database Schema

Postgres, single database, **schema-per-environment**, **row-level tenancy** (see §5 for the isolation model). Core tables (columns abbreviated to essentials):

### 4.1 Platform / tenancy

```
organizations (tenants)
  id (uuid, pk)
  name
  slug
  plan_id → plans.id
  status (active, trialing, suspended, cancelled)
  timezone
  created_at, updated_at

plans
  id, name, call_minutes_included, seat_limit, price_cents, features (jsonb)

users
  id, email, password_hash / external_auth_id
  created_at

organization_members
  id, organization_id → organizations.id, user_id → users.id
  role (owner, admin, agent, viewer)
  invited_at, joined_at, status
```

### 4.2 Assistant / prompt configuration

```
assistants
  id, organization_id, vapi_assistant_id (external ref)
  name, status (draft, active, paused)
  voice_config (jsonb: provider, voice_id, speed, etc.)
  telephony_number_id → phone_numbers.id
  current_prompt_version_id → prompt_versions.id
  sync_status (pending, syncing, synced, failed), last_synced_at, last_sync_error
  created_at, updated_at

prompt_templates
  id, organization_id (nullable = platform-global template), name, category

prompt_versions
  id, prompt_template_id, organization_id
  version_number
  system_prompt (text)
  variables (jsonb schema)
  tool_definitions (jsonb — maps to Vapi "functions")
  is_published (bool)
  sync_status (pending, syncing, synced, failed), last_synced_at, last_sync_error
  created_by, created_at

phone_numbers
  id, organization_id, e164_number, vapi_number_id, status
  sync_status (pending, syncing, synced, failed), last_synced_at, last_sync_error

vapi_sync_jobs
  id, organization_id, entity_type (assistant, prompt_version, phone_number, tool_definition)
  entity_id, action (create, update, publish), status (pending, in_progress, succeeded, failed)
  attempt_count, next_retry_at, last_error
  created_at, updated_at
  -- outbox table: source of truth for "what does Vapi still need to catch up on"
```

### 4.3 Knowledge base

```
knowledge_bases
  id, organization_id, name, status

kb_documents
  id, knowledge_base_id, source_type (upload, url, manual, integration)
  title, storage_key (S3), raw_text, status (processing, ready, failed)
  checksum, updated_at

kb_chunks
  id, kb_document_id, organization_id
  content, embedding (vector), token_count, chunk_index

kb_sync_jobs
  id, knowledge_base_id, status, started_at, finished_at, error
```

### 4.4 Calls

```
calls
  id (pk), organization_id, assistant_id
  vapi_call_id (external ref, unique)
  direction (inbound, outbound)
  from_number, to_number
  started_at, ended_at, duration_seconds
  end_reason
  status (queued, in_progress, completed, failed)
  cost_cents
  recording_url (S3), transcript_id → call_transcripts.id
  sentiment_score, outcome_tag (booked, transferred, voicemail, spam, resolved, escalated)
  created_at

call_transcripts
  id, call_id, organization_id
  full_text
  turns (jsonb array: role, text, start_ms, end_ms, tool_calls)

call_events
  id, call_id, organization_id
  event_type (webhook raw event: status-update, function-call, end-of-call-report, etc.)
  payload (jsonb, raw from Vapi)
  received_at
  -- append-only, immutable, source of truth for reprocessing

call_tool_invocations
  id, call_id, organization_id
  tool_name, request_payload, response_payload, latency_ms, success
```

### 4.5 Integrations

```
integrations
  id, organization_id, provider (google_calendar, hubspot, salesforce, twilio_sms, slack, etc.)
  status (connected, error, disconnected)
  credentials_ref (pointer to secrets manager, never raw tokens in DB)
  config (jsonb)
  connected_at, last_synced_at

integration_events
  id, integration_id, organization_id, event_type, payload, status, created_at
```

### 4.6 Analytics / billing support

```
usage_records
  id, organization_id, period_start, period_end
  call_minutes_used, calls_count, overage_minutes

audit_logs
  id, organization_id, actor_user_id, action, target_type, target_id, metadata, created_at
```

### 4.7 Indexing notes

- Every tenant-scoped table has `organization_id` indexed (and included in composite PK/partition strategy for large tables — see §15).
- `calls`, `call_events`, `call_transcripts` are the highest-volume tables → candidates for **time-based partitioning** (monthly) from the start.
- `kb_chunks.embedding` uses an IVFFlat/HNSW index via pgvector once volume warrants it.

---

## 5. Multi-Tenant Architecture

### 5.1 Isolation model

**Pooled multi-tenancy with Postgres Row-Level Security (RLS)** is the recommended default:

- Single database, single schema, shared tables.
- Every tenant-owned table carries `organization_id`.
- RLS policies enforce `organization_id = current_setting('app.current_org')` on every query.
- The API sets `app.current_org` per request (via a transaction-scoped `SET LOCAL`) immediately after authenticating and resolving tenant — this makes cross-tenant leakage require an *explicit* bypass, not an accidental missing `WHERE` clause.

This is the right default for "thousands of businesses": it avoids the operational cost of thousands of databases/schemas while still giving strong isolation guarantees at the query layer, not just the application layer.

**When to break the pool:** Large enterprise customers with compliance requirements (dedicated DB, data residency) can be moved to a **silo model** — a separate database/cluster — without changing application code, because the data-access layer is already tenant-parameterized. Plan for this as a "tier 2 hosting" option, not a rewrite.

### 5.2 Tenant resolution

- Dashboard: tenant is resolved from the authenticated session (`organization_id` on the JWT/session) plus a `tenantId` route param that must match — prevents a user with two orgs from being served the wrong one by a stale link.
- Webhooks/public APIs: tenant resolved via the Vapi assistant ID / phone number mapping stored in our `assistants`/`phone_numbers` tables — Vapi doesn't know about our tenants, so this mapping is the critical join point.
- Every internal service call and log line carries `organization_id` as a first-class field for traceability.

### 5.3 Tenant-aware caching & queues

- Redis keys are always prefixed `org:{organization_id}:...`.
- Queue jobs carry `organization_id` in the payload; workers set the RLS context before touching the DB.
- Rate limits (see §7) are applied per-tenant, not just per-API-key, to prevent noisy-neighbor effects.

### 5.4 Configuration inheritance

- **Platform-level defaults** (base prompt templates, default tool definitions, default voice) →
- **Tenant-level overrides** (their own prompt versions, business hours, escalation numbers) →
- **Assistant-level specifics** (multiple assistants per tenant, e.g. "Sales Line" vs "Support Line", each inheriting tenant defaults but with their own prompt version).

---

## 6. Authentication and Authorization

### 6.1 Authentication

- Recommend **Clerk, WorkOS, or Auth0** to move fast and get SSO/SAML/MFA for free rather than hand-rolling — this is not a differentiator worth building in-house early on.
- JWT access tokens (short-lived, ~15 min) + rotating refresh tokens (httpOnly secure cookies for the dashboard).
- Service-to-service auth (webhooks service → core API, workers → core API) via signed internal tokens or mTLS, not user JWTs.
- Vapi webhook requests authenticated via **HMAC signature verification** using a per-tenant or platform-level webhook secret (Vapi supports signed payloads) — reject anything that doesn't verify before it touches business logic.

### 6.2 Authorization (RBAC + tenant scoping)

Two orthogonal dimensions:

1. **Tenant membership** — does this user belong to this organization at all?
2. **Role within tenant** — what can they do?

Recommended roles (extensible):

| Role | Capabilities |
|---|---|
| Owner | Full control incl. billing, delete org, manage all members |
| Admin | Manage assistants, prompts, integrations, KB, view billing |
| Agent | View calls, listen to recordings, view analytics, no config changes |
| Viewer | Read-only dashboard access |

- Implemented as policy checks in a shared `@platform/auth` package (`can(user, action, resource)`), used identically in API guards and dashboard UI gating — single source of truth, not duplicated logic.
- **Superadmin/internal ops role** exists outside the tenant model entirely (platform staff), heavily audit-logged, used for support and provisioning.

### 6.3 API keys (for customer integrations / future public API)

- Per-tenant API keys, scoped, hashed at rest, rate-limited independently, revocable, with last-used tracking.

---

## 7. API Design

### 7.1 Style

- **REST + JSON** for the core CRUD-heavy surface (assistants, prompts, KB, integrations, settings) — simpler to version, cache, and document (OpenAPI) than GraphQL for this shape of domain.
- Consider a thin **BFF layer** in the dashboard app that aggregates multiple core-API calls for specific pages, rather than exposing every internal microservice directly to the browser.
- Webhooks (from Vapi, Stripe, etc.) are a separate, narrowly-scoped ingestion API — never the same surface as the customer-facing API.

### 7.2 Conventions

- Base path: `/api/v1/...`, versioned from day one.
- All tenant-scoped routes nested under the authenticated context, e.g. `/api/v1/organizations/{orgId}/assistants/{assistantId}`.
- Consistent envelope: `{ data, meta, error }`.
- Cursor-based pagination for list endpoints (`calls`, `call_events`) given expected volume.
- Idempotency keys required on all mutating endpoints that could be retried (especially anything triggering outbound calls or billing actions).
- Rate limiting: per-API-key and per-organization, sliding window in Redis; distinct, generous limits for dashboard traffic vs. tighter limits for public/customer API keys.

### 7.3 Representative endpoint groups

```
POST   /organizations                          (signup)
GET    /organizations/:orgId
PATCH  /organizations/:orgId/settings

GET    /organizations/:orgId/assistants
POST   /organizations/:orgId/assistants
PATCH  /organizations/:orgId/assistants/:id
POST   /organizations/:orgId/assistants/:id/publish   (pushes config to Vapi)

GET    /organizations/:orgId/prompts
POST   /organizations/:orgId/prompts/:id/versions
POST   /organizations/:orgId/prompts/:id/versions/:versionId/publish

POST   /organizations/:orgId/knowledge-base/documents
GET    /organizations/:orgId/knowledge-base/documents/:id
DELETE /organizations/:orgId/knowledge-base/documents/:id

GET    /organizations/:orgId/calls?cursor=&status=&from=&to=
GET    /organizations/:orgId/calls/:id
GET    /organizations/:orgId/calls/:id/transcript
GET    /organizations/:orgId/calls/:id/recording   (signed URL)

GET    /organizations/:orgId/analytics/overview
GET    /organizations/:orgId/analytics/calls-by-outcome

GET    /organizations/:orgId/integrations
POST   /organizations/:orgId/integrations/:provider/connect
DELETE /organizations/:orgId/integrations/:provider

-- internal only --
POST   /internal/webhooks/vapi
POST   /internal/webhooks/stripe
```

### 7.4 API documentation

- OpenAPI spec generated from NestJS decorators (or Zod-to-OpenAPI), published internally and eventually as public API docs for customers who want direct integration.

---

## 8. Dashboard Page Structure

```
/login, /signup, /invite/:token

/:orgSlug/overview
    - call volume today/week, active assistant status, quick health indicators

/:orgSlug/assistants
    /:assistantId
        /configuration     - name, phone number, voice, behavior toggles
        /prompt             - prompt editor, version history, test/publish
        /tools              - which tools/functions this assistant can call
        /test-call          - simulated / live test call interface

/:orgSlug/calls
    /                       - filterable call log (date, outcome, duration)
    /:callId                - transcript, recording player, tool invocations, tags

/:orgSlug/knowledge-base
    /documents              - upload/manage source docs
    /sync-status            - embedding/indexing job status

/:orgSlug/integrations
    /                       - available + connected integrations, OAuth flows
    /:provider/settings

/:orgSlug/analytics
    /overview               - trends, outcomes, sentiment, cost
    /reports                - exportable reports

/:orgSlug/billing
    /                       - plan, usage vs. included minutes, invoices

/:orgSlug/settings
    /general                - org name, timezone, business hours
    /team                   - members, roles, invites
    /notifications          - alert preferences (missed calls, escalations)
    /api-keys               - for customers using the public API

-- separate app --
/admin (internal)
    /organizations          - provisioning, plan changes, suspension
    /system-health          - webhook lag, queue depth, error rates
    /support-tools          - impersonate (audited), replay call events
```

---

## 9. Vapi Integration Architecture

### 9.1 Abstraction boundary

All Vapi interaction goes through a single internal package: `packages/vapi-client`. Nothing else in the codebase imports the Vapi SDK directly. This means:

- If Vapi changes its API, or we ever add/swap a second voice provider, only this package changes.
- The package exposes **our own domain verbs**, not Vapi's raw API shape: `provisionAssistant(orgId, config)`, `publishPromptVersion(assistantId, promptVersion)`, `assignPhoneNumber(...)`, `triggerOutboundCall(...)`.

### 9.2 Assistant provisioning flow

1. Customer configures assistant in our dashboard (prompt, voice, tools, phone number request) — all stored in our DB first, in `draft` status. The save is a pure database write; it succeeds or fails independently of Vapi's availability.
2. On "Publish," the API **writes the target state to our DB immediately** (new `prompt_versions` row marked `is_published = true`, or updated assistant config) and returns success to the dashboard right away, with the assistant/version's `sync_status` set to `pending`. It does **not** wait on a Vapi API call before responding.
3. A queued job (per §9.6) then does the actual work against Vapi: renders the final payload from `prompt_versions` + `tool_definitions` + org-level defaults, calls Vapi's create/update assistant API, and — on success — stores the returned `vapi_assistant_id`/`vapi_number_id` and flips `sync_status` to `synced`. On failure, it retries with backoff and surfaces `sync_status = failed` with the error visible in the dashboard.
4. Our DB is always the source of truth; Vapi's assistant object is a **derived, rebuildable artifact**. This means we can always regenerate any Vapi assistant from our own data if Vapi state ever drifts or is lost, and it means the customer's edit is never held hostage by Vapi's uptime.

### 9.3 Tool/function bridge

- Vapi "functions" (tools the assistant can call mid-conversation — e.g., check availability, create a booking, look up an order) are defined in our DB (`tool_definitions` on `prompt_versions`) and registered with Vapi as function schemas.
- When Vapi invokes a function during a live call, it hits **our webhook/function endpoint**, we execute the actual business logic (calendar check, CRM lookup, etc.) against the relevant integration, and return the result synchronously within Vapi's expected latency window.
- This is the seam where multi-tenant integrations (Google Calendar, HubSpot, etc.) actually plug into a live call.

### 9.4 Outbound calls

- Triggered by our platform (e.g., appointment reminders, lead callbacks) via Vapi's outbound call API, always tagged with `organization_id` and a `campaign`/`trigger_reason` so they roll up correctly in analytics and billing.

### 9.5 Versioning and rollback

- Every publish creates a new `prompt_versions` row; publishing to Vapi is just "make this version active." Rollback = republish a prior version. Full history retained for audit/debugging ("why did the assistant say that on March 3rd?").

### 9.6 Write path: database-first, asynchronous Vapi sync

Every mutation that ultimately needs to reach Vapi — assistant create/update, prompt publish, phone number assignment, tool/function registration — follows one uniform pattern, so there is exactly one write path to reason about, test, and monitor:

1. **Write to our DB, synchronously, in the request.** This is the only thing the customer's save/publish action waits on. It is fast and has no external dependency.
2. **Enqueue a sync job** (`vapi_sync_jobs`: `id`, `organization_id`, `entity_type` [assistant/prompt_version/phone_number/tool_definition], `entity_id`, `action`, `status` [pending/in_progress/succeeded/failed], `attempt_count`, `last_error`, `next_retry_at`) — this table doubles as an outbox and as the data source for the sync-status UI.
3. **A dedicated Vapi-sync worker** consumes the queue, calls the Vapi API, and updates both the job row and a `sync_status`/`last_synced_at`/`last_sync_error` column on the owning entity (`assistants`, `prompt_versions`, `phone_numbers`).
4. **Retries with exponential backoff** on transient failures (timeouts, 5xx, rate limits); a fixed cap after which the job is marked `failed` and surfaced for either automatic alerting (if this is systemic — e.g., Vapi is down) or manual retry (if it's entity-specific — e.g., an invalid voice ID).
5. **Idempotency**: sync jobs are safe to retry or replay — they always resolve to "make Vapi's state match our DB's current state for this entity," not "apply this specific delta," so a retried job after a partial failure can't double-apply or corrupt anything.
6. **Dashboard visibility**: every entity with a sync lifecycle shows its `sync_status` in the UI (synced / syncing / pending / failed-with-retry-option) so customers always know whether what they see in our dashboard has actually reached the phone system yet — this is a trust feature, not just an internals detail.

This is the same pattern used later for prompt publish (§11) and tool/integration registration (§15) — it is established once, here, and reused, not reinvented per feature.

---

## 10. Webhook Architecture

### 10.1 Dedicated ingestion service

Webhooks (from Vapi primarily, plus Stripe, OAuth providers, etc.) are handled by a **separate lightweight service** (`apps/webhooks`), not the core API, so that:

- A slow/buggy business-logic deploy never risks dropping live-call webhooks.
- It can be scaled and rate-tuned independently (webhook bursts are spiky and latency-sensitive, especially Vapi's mid-call function-call webhooks).

### 10.2 Flow

1. Request received → **verify signature** (HMAC) → reject fast if invalid.
2. Resolve tenant from payload (`vapi_call_id` → `assistant_id` → `organization_id`, or `phone_number` mapping).
3. **Persist raw event immediately** to `call_events` (append-only) before any processing — this is our durability guarantee; nothing is "processed then discarded."
4. Classify event type:
   - **Synchronous, latency-critical** (function/tool call during live conversation) → handled inline, must respond within Vapi's timeout (execute integration call, return result).
   - **Asynchronous** (call started, call ended, end-of-call report, transcript ready) → enqueue job, return 200 immediately, process via workers.
5. Workers consume the queue: update `calls` status/duration/cost, store transcript, kick off scoring/sentiment job, trigger notifications (e.g., "missed call" alert to tenant), update analytics rollups.

### 10.3 Reliability

- At-least-once delivery assumed from Vapi → all handlers **idempotent** (keyed on `vapi_call_id` + event type + timestamp, upserts not inserts where possible).
- Dead-letter queue for events that fail processing after N retries, with alerting — never silently drop a call event.
- Replay tooling: since raw events are persisted before processing, we can always reprocess a call's full event history if a downstream bug is fixed later.

---

## 11. Prompt Management Strategy

### 11.1 Structure

- Prompts are **templates with variables**, not flat strings: `system_prompt` contains placeholders (`{{business_name}}`, `{{business_hours}}`, `{{escalation_number}}`) resolved at publish time from tenant settings — this lets us improve the underlying template platform-wide without editing every tenant's text by hand.
- **Prompt library**: platform-curated base templates per vertical (e.g., "Dental Office Receptionist," "Home Services Dispatcher," "Real Estate Front Desk") that tenants start from and customize.

### 11.2 Versioning & governance

- Every edit creates a new immutable `prompt_versions` row (never mutate a published version in place).
- Draft → Review/Test → Published lifecycle, with a "test call" step (simulated or real call) required/encouraged before publish.
- Diff view between versions in the dashboard (important for support/debugging and for customer trust — "here's exactly what changed").
- Rollback is a first-class action, not a support ticket.

### 11.3 Tool/function definitions travel with the version

- A prompt version and its associated tool definitions are versioned **together**, since a prompt often assumes specific tools exist ("you can check availability using the `check_availability` function") — decoupling them risks a published prompt referencing a tool that no longer exists.

### 11.4 Prompt composition at render time

Final prompt sent to Vapi = platform system scaffolding (safety/behavior guardrails, common to all tenants) + vertical template + tenant customization + injected dynamic variables (business hours, KB summary/instructions, live variables). This layered composition is generated by the `prompt-engine` package and is fully deterministic/reproducible from stored data.

---

## 12. Knowledge Base Architecture

### 12.1 Ingestion

- Sources: file upload (PDF/DOCX/TXT), URL crawl, manual text entry, and (later) live sync from integrations (e.g., a customer's Notion/Google Docs FAQ, or their CRM's service catalog).
- Pipeline: upload → store raw file in S3 → extract text → chunk (semantic/sliding-window) → embed → store in `kb_chunks` with `organization_id` on every row (tenant isolation at the vector layer too, not just relational).

### 12.2 Retrieval at call time

- Two integration patterns, and both are reasonable depending on latency tolerance:
  1. **RAG-at-runtime**: assistant's tool-call triggers a "search knowledge base" function during the live call, which does a similarity search scoped to `organization_id` and returns a snippet to be spoken. Most flexible, adds a bit of latency.
  2. **Pre-baked context**: for smaller/stable KBs, summarize/compress the KB into the system prompt itself at publish time (works well for FAQs under a certain size), avoiding runtime latency entirely.
- Recommendation: support both, default to (2) for small KBs, auto-switch to (1) once KB size crosses a threshold.

### 12.3 Freshness

- `kb_sync_jobs` tracks re-embedding runs; document edits trigger re-chunking/re-embedding of only the changed document, not the whole KB.
- Staleness indicators surfaced in the dashboard ("last synced 3 days ago").

### 12.4 Isolation

- Every vector query is scoped by `organization_id` at the SQL/query level (pgvector query includes `WHERE organization_id = ...`), never relying on a separate index-per-tenant until scale demands it (see §18).

---

## 13. Call Storage

### 13.1 What we store per call

- **Metadata** (`calls` table): timing, numbers, cost, status, outcome tag — always in Postgres, always fast to query for the dashboard call log.
- **Recording**: audio file stored in S3 (fetched from Vapi post-call or streamed if Vapi supports it), referenced by a signed, expiring URL — never a permanently public link. Encrypted at rest (S3 SSE).
- **Transcript**: full turn-by-turn transcript stored in `call_transcripts.turns` (jsonb) for structured querying (e.g., "find calls where the assistant said X"), plus `full_text` for search.
- **Raw events**: everything Vapi sent us, verbatim, in `call_events` — our audit trail and reprocessing safety net.

### 13.2 Retention & compliance

- Configurable **retention policy per tenant/plan** (e.g., 90 days on starter plan, unlimited on enterprise) — enforced by a scheduled job that purges recordings/transcripts (and optionally anonymizes metadata) past the window.
- Recordings and transcripts are exactly the kind of data that trigger **PII/PCI/HIPAA-adjacent** concerns depending on verticals (medical, financial) — build **redaction hooks** early (e.g., a post-call job that can flag/redact card numbers, SSNs mentioned on calls) even if not turned on for every tenant initially.
- Support **customer-initiated deletion** ("right to be forgotten" / call deletion) as a first-class dashboard action, not just a backend script.

### 13.3 Storage scaling

- S3 lifecycle rules to transition older recordings to cheaper storage classes (Glacier/IA) automatically.
- `calls`/`call_events`/`call_transcripts` partitioned by month from the start (see §18) so retention purges are cheap `DROP PARTITION` operations, not slow `DELETE` scans.

---

## 14. Analytics Architecture

### 14.1 Two-tier design

1. **Operational analytics (Postgres)** — fast, simple aggregates for the dashboard's "Overview" page (today's call count, average duration, outcome breakdown) computed via materialized views or scheduled rollup jobs, refreshed every few minutes. Good enough at moderate scale.
2. **Warehouse analytics (ClickHouse/BigQuery)** — as volume grows, call events are streamed (via the event bus) into a columnar warehouse for heavier reporting: cohort trends, funnel analysis (call → booking → show-up), cross-tenant benchmarking (for platform's own product decisions), and customer-facing custom report builders.

### 14.2 Metrics tracked (per tenant, rolling up to platform level for internal use)

- Call volume (inbound/outbound), answer rate, average handle time.
- Outcome distribution (booked, resolved, transferred to human, voicemail, abandoned, spam).
- Sentiment/quality score trends.
- Tool/function success & latency (are calendar lookups failing? Slow?).
- Cost per call, minutes used vs. plan allowance (feeds billing).
- Conversion funnel (calls → appointments booked → shown up, when integrated with a calendar/CRM).

### 14.3 Access pattern

- Dashboard reads from fast Postgres rollups for real-time views; "Reports" / export features can query the warehouse for heavier historical slices without impacting operational DB performance.
- All analytics queries tenant-scoped at the query layer; platform-level/aggregate analytics (for internal product/business decisions) run against the warehouse with tenant IDs anonymized/aggregated as appropriate.

---

## 15. Future Integrations

Design the integration layer as a **plugin architecture** from the start, even with only 1-2 integrations at launch:

- `integrations` table + a common interface (`connect()`, `disconnect()`, `sync()`, `handleWebhook()`, `getAvailableTools()`) that each provider implements.
- Each integration can optionally **register additional Vapi tool/functions** dynamically (e.g., connecting Google Calendar adds a `check_availability` and `book_appointment` function to that tenant's assistant automatically).

Anticipated integrations, roughly in priority order:

- **Scheduling**: Google Calendar, Outlook/Microsoft 365, Calendly, Acuity.
- **CRM**: HubSpot, Salesforce, Pipedrive, GoHighLevel (common in SMB/agency reseller space).
- **Communication**: Twilio (SMS follow-ups), SendGrid/Postmark (email), Slack (internal alerts to staff).
- **Payments**: Stripe (for both platform billing and enabling assistants to take payment info/deposits).
- **Vertical-specific**: EHR systems (medical), property management systems (real estate), POS systems (restaurants/retail).
- **Reseller/agency layer**: white-label support, sub-account management for agencies managing multiple end-clients (likely needed once you have agencies reselling the platform — worth flagging in the tenancy model as "parent organization" support later).

---

## 16. Deployment Architecture

### 16.1 Environments

- `dev` → `staging` → `production`, fully isolated infra (separate DBs, separate Vapi accounts/API keys if possible, separate secrets).

### 16.2 Infrastructure (AWS-centric example, translates to GCP/Azure equivalents)

- **Compute**: ECS Fargate for `api`, `webhooks`, `workers`, `dashboard` (SSR) as independently scaled services. Move to EKS only once you need finer-grained orchestration than ECS gives you.
- **Database**: RDS Postgres, Multi-AZ, read replica(s) for analytics/reporting queries so heavy reads don't compete with transactional writes.
- **Cache/Queue**: ElastiCache Redis, cluster mode once volume demands it.
- **Object storage**: S3 with per-environment buckets, lifecycle policies.
- **CDN**: CloudFront in front of dashboard static assets and any public widgets.
- **Secrets**: AWS Secrets Manager / Parameter Store — integration OAuth tokens and Vapi API keys never touch application config files or the DB in plaintext.
- **IaC**: Terraform, modularized per service, reviewed like application code.

### 16.3 CI/CD

- GitHub Actions: lint → typecheck → test → build → push image → deploy.
- Separate pipelines per app (`api`, `webhooks`, `workers`, `dashboard`) so a dashboard-only change doesn't require redeploying webhook infra.
- Database migrations run as an explicit, gated pipeline step (never auto-applied on app boot in production) with backward-compatible migration discipline (expand/contract pattern) so deploys and migrations can be decoupled.
- Blue/green or rolling deploys for the API and webhook services specifically, since webhook downtime = dropped live-call events.

### 16.4 Multi-region (future)

- Start single-region. Design the schema/config so a future active-passive DR region (or full multi-region for latency/compliance) is a network/infra change, not an application rewrite — i.e., avoid baking single-region assumptions (like hardcoded endpoints) into business logic.

---

## 17. Security Considerations

- **Tenant isolation enforced at the database layer (RLS)**, not just application checks — defense in depth against a missed `WHERE organization_id = ...`.
- **Webhook signature verification** mandatory on every inbound webhook (Vapi, Stripe, OAuth callbacks).
- **Secrets management**: no third-party integration tokens or Vapi keys in the codebase, env files committed to git, or plaintext DB columns — Secrets Manager + encryption, rotated regularly.
- **Encryption**: TLS everywhere in transit; S3 SSE + RDS encryption at rest; consider field-level encryption for especially sensitive integration credentials.
- **PII/call data handling**: recordings/transcripts treated as sensitive by default; access logged (who listened to/viewed which call, when) via `audit_logs`; redaction hooks for verticals handling health/financial data (see §13).
- **Least privilege**: service-to-service credentials scoped narrowly (webhook service can write `call_events` but shouldn't have blanket DB admin rights); superadmin/impersonation actions fully audit-logged.
- **Rate limiting & abuse prevention**: per-tenant and per-API-key limits to prevent one tenant's misbehaving integration (or a compromised API key) from degrading the platform or running up telephony costs.
- **Input validation**: strict schema validation (Zod) on every API boundary and on webhook payloads before they touch business logic — treat Vapi payloads as untrusted input.
- **Dependency/ vulnerability scanning**: automated in CI (Dependabot/Snyk).
- **Compliance runway**: architect with SOC 2 in mind from day one (audit logging, access reviews, encryption, change management) even if formal certification comes later — retrofitting is much more expensive than designing for it.

---

## 18. Scalability Considerations

- **Stateless application tiers**: API, webhook, and worker services are horizontally scalable (no local state), scaling behind load balancers/autoscaling groups based on CPU/queue depth.
- **Database growth path**:
  1. Start: single Postgres instance, RLS-based pooled tenancy.
  2. Add read replicas for analytics/reporting load.
  3. Partition high-volume tables (`calls`, `call_events`, `call_transcripts`, `kb_chunks`) by time (and optionally tenant hash) once volumes justify it.
  4. Offer dedicated DB/silo hosting for large enterprise tenants without changing app code (tenant-parameterized data layer makes this a config change, not a rewrite).
- **Webhook burst handling**: webhook ingestion decoupled from processing via queues so a spike (e.g., many simultaneous calls ending at once) doesn't overwhelm downstream systems — ingestion just needs to ack fast and persist raw events.
- **Caching strategy**: hot-path reads (assistant config, active prompt version, tenant settings) cached in Redis with tenant-prefixed keys and short TTL + explicit invalidation on publish/update events, to keep live-call latency low without hitting Postgres on every function-call webhook.
- **Vector search scaling**: pgvector is fine up to a meaningful number of tenants/documents; plan the migration path to a dedicated vector DB (Pinecone/Weaviate/Qdrant) behind the same internal interface so the KB module doesn't need to change when the swap happens.
- **Analytics offload**: move heavy/historical analytics workloads to the warehouse tier early (§14) so reporting queries never compete with live transactional traffic on the primary DB.
- **Cost control at scale**: track and cap per-tenant Vapi usage/minutes against plan limits in near-real-time (via usage_records + webhook-driven counters) to prevent runaway telephony costs from a single tenant or a runaway loop in an assistant's tool-calling logic.
- **Multi-region readiness**: even while running single-region, avoid region-specific assumptions in code so growth into multi-region (for latency or data-residency reasons) is primarily an infrastructure exercise.
- **Queue/broker graduation path**: BullMQ/Redis is sufficient for a long time; design job payloads and consumer patterns so a future move to Kafka/SQS-SNS (for stricter ordering, replay, or fan-out to more consumers like analytics + notifications + integrations simultaneously) doesn't require rewriting job logic, just the transport.

---

## Appendix: Key Architectural Decisions Summary

| Decision | Choice | Why |
|---|---|---|
| Tenancy model | Pooled + RLS, silo option for enterprise | Balances operational simplicity with strong isolation and an upgrade path |
| Vapi coupling | Fully abstracted behind `vapi-client` package | Vapi is a vendor, not the architecture |
| Source of truth for assistant config | Our DB, Vapi state is derived/rebuildable | Survives Vapi outages/drift, enables versioning/rollback |
| Prompt storage | Versioned, templated, tool-defs bundled with version | Auditability, rollback, safe iteration |
| Call data durability | Raw webhook events persisted before processing | Reprocessable, auditable, resilient to bugs |
| API style | REST, versioned, BFF for dashboard | Simpler ops/docs for this domain shape than GraphQL |
| Analytics | Two-tier: Postgres rollups + warehouse | Fast dashboards without sacrificing deep reporting |
| Auth | Managed provider (Clerk/WorkOS/Auth0) | SSO/MFA "for free," focus engineering on core product |

**This document is the blueprint. Section-level ADRs (Architecture Decision Records) should be created in `docs/adr/` as implementation begins, especially where a section above lists more than one viable option (e.g., NestJS vs Fastify, Prisma vs Drizzle) so the final call and rationale are recorded.**
