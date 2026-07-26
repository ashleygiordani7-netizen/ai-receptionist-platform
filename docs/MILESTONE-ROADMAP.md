# Milestone Roadmap
## Multi-Tenant AI Receptionist SaaS Platform

**Companion document to:** TDD-AI-Receptionist-Platform.md
**Ordering principle:** Each milestone produces a deployable, independently testable increment. Order is chosen so that no milestone requires reworking a foundational decision made in an earlier one — tenancy and auth come before anything tenant-scoped; **business data and AI-configuration data are both fully modeled and editable in our own dashboard/database before Vapi enters the picture at all**, so the riskiest external dependency is introduced against data that already exists and is already correct, rather than being invented alongside it; a real Vapi call loop exists before prompt sophistication, knowledge bases, or analytics are layered on top of it; billing and integrations come after the core call loop is trustworthy, not before.

---

## M0 — Platform Foundations (no customer-facing features yet)

**Goal:** Stand up the skeleton everything else builds on, so later milestones are additive, not corrective.

**Features:** None customer-facing. This is infrastructure and scaffolding only.

**Database changes:**
- Provision Postgres instance(s) per environment (dev/staging/prod).
- Establish migration tooling (Prisma/Drizzle) and the expand/contract migration convention.
- No domain tables yet beyond a `schema_migrations` bookkeeping table.

**Backend work:**
- Monorepo scaffold per the folder structure in the TDD (`apps/api`, `apps/webhooks`, `apps/workers`, `packages/*`).
- Base NestJS/Fastify app with health check endpoint, structured logging (with `organization_id` field reserved for later), OpenTelemetry wiring.
- CI pipeline: lint, typecheck, test, build, per-app Docker images.
- Terraform for VPC, RDS, Redis, S3 buckets, ECS/Fargate services (empty/hello-world containers is fine at this stage).
- Secrets Manager integration wired end-to-end (even if only holding placeholder values).

**Frontend work:**
- Next.js dashboard scaffold, design system package (`packages/ui`) initialized, deployed to staging with a static "coming soon" or health page.

**Vapi work:**
- Create a Vapi account/sandbox, obtain API keys, store in Secrets Manager.
- Manual "hello world" test call directly against Vapi (no integration code) to confirm account setup and phone number provisioning works at all — de-risks the whole platform's core dependency before building on it.

**Definition of Done:**
- All services build, deploy, and pass health checks in staging via CI/CD with no manual steps.
- A skeleton Vapi call can be placed/received manually through the Vapi dashboard using the sandbox account.
- Terraform apply is repeatable and destructible (can tear down/rebuild staging cleanly).

---

## M1 — Tenancy, Auth, and Organization Management

**Goal:** Every later feature can assume "there is a logged-in user, belonging to an organization, with a role" — this is the bedrock multi-tenant primitive and must be right before anything is built on top of it.

**Features:**
- Sign up, log in, log out.
- Create an organization (tenant) on signup.
- Invite team members, accept invites, assign roles (owner/admin/agent/viewer).
- Switch between organizations if a user belongs to more than one.

**Database changes:**
- `organizations`, `users`, `organization_members`, `plans` (stub with one default plan row).
- Enable Postgres RLS on all tenant-scoped tables going forward; write the `SET LOCAL app.current_org` middleware pattern now, as a reusable piece.
- `audit_logs` table created now (even if only auth events populate it initially) — far cheaper to bake in from the start than retrofit later.

**Backend work:**
- Integrate managed auth provider (Clerk/WorkOS/Auth0) or custom JWT+refresh flow.
- Tenant-resolution middleware: resolves `organization_id` from session, sets RLS context per request/transaction.
- `packages/auth` policy engine (`can(user, action, resource)`) with the four base roles wired to real guards.
- Organization + membership CRUD endpoints.
- Audit logging for auth events (login, invite sent/accepted, role changed).

**Frontend work:**
- Auth screens (login, signup, invite acceptance).
- Organization switcher.
- Settings → Team page (invite, role management).
- Route guarding by role (UI-level gating mirrors backend policy).

**Vapi work:**
- None yet — deliberately no Vapi dependency in this milestone so tenancy/auth can be tested in complete isolation.

**Definition of Done:**
- A new user can sign up, create an org, invite a teammate with a specific role, and that teammate can accept and log in.
- RLS is verified with an automated test: a user from Org A cannot read Org B's data even via a crafted request.
- Audit log entries are created for all auth/membership actions and visible (raw, even if unstyled) in the admin app.

---

## M2 — Business Profile

**Goal:** Establish the "dashboard → database → sync service" pattern the rest of the platform will repeat, using pure business data with zero AI or Vapi dependency — and produce the canonical business-profile record that M3's AI configuration, M4's Vapi provisioning, and M6's prompt-engine will all read from later. This milestone is deliberately "boring": nothing here is AI configuration, which keeps it cheap to build and gives the team a clean, low-risk place to prove the tenant-scoped dashboard/DB pattern before any AI-specific or Vapi-specific complexity is introduced.

**Features:**
- Tenant can set and edit: company name, logo, phone (the business's existing/public number), address, website, opening hours (per weekday), timezone, emergency contact, and a holiday schedule (dated closures/overrides, distinct from the recurring weekly opening hours).
- Settings are validated (opening hours make sense per timezone, phone/website format, no overlapping holiday entries) and reflected back immediately in the dashboard.

**Database changes:**
- `business_profiles` table (kept separate from `organizations` so the core tenancy record stays a lean identity record, and separate from anything AI-related so this table's lifecycle never entangles with prompt/assistant concerns): `legal_name`, `display_name`, `logo_url`, `public_phone_number`, `website_url`, `address` (structured: line1/line2/city/region/postal/country), `opening_hours` (jsonb, per-weekday recurring ranges), `holiday_schedule` (jsonb array of dated overrides: date, closed/adjusted-hours, label e.g. "Christmas Day"), `timezone`, `emergency_contact_name`/`emergency_contact_number`.
- No RLS changes needed beyond what M1 already established — this table is tenant-scoped like everything else, which is itself a useful early confirmation that the M1 pattern generalizes cleanly to a second table.

**Backend work:**
- Business profile CRUD endpoints, validated with shared Zod schemas (`packages/shared-types`) so frontend and backend share one source of truth for what "valid opening hours" or "valid holiday entry" means.
- Logo upload flow: S3 storage + signed URL retrieval — the first (very small) exercise of the object-storage pattern that recordings and KB documents will lean on much harder in later milestones.
- A lightweight "profile changed" hook (an internal function call for now, not a full event bus) that later milestones can subscribe to — e.g., M6's prompt-engine re-render when business hours change. Establishing the hook point now avoids a scattered retrofit later.

**Frontend work:**
- Settings → Business Profile page: forms for all fields above, logo uploader, opening-hours editor (per-weekday, with a sensible default template like "Mon–Fri 9–5"), holiday schedule editor (add/remove dated entries), timezone picker.
- This is also the natural place to validate the tenant-aware routing/layout pattern (`/:orgSlug/settings/...`) that every subsequent dashboard page will reuse.

**Vapi work:**
- None. This is the deliberate point of the milestone — prove the dashboard/DB/tenant pattern in isolation, on data that has nothing to do with AI behavior, before M3 introduces AI-specific configuration and M4 introduces Vapi risk.

**Definition of Done:**
- A tenant can fill out and save every business profile field, including at least one holiday override, reload the page, and see it all persisted correctly.
- Validation rejects malformed input (bad phone/website format, overlapping opening hours, conflicting holiday entries) with clear errors.
- A second tenant's business profile is verifiably isolated from the first (same RLS test pattern as M1, applied to a new table).
- Business profile data is available via an internal API/service call in a shape M3, M4, and M6 can consume without schema changes.

---

## M3 — AI Receptionist Configuration

**Goal:** Model everything about *how the assistant should behave and sound* — deliberately still with zero Vapi dependency — so the team proves the dashboard/DB pattern a second time on AI-specific data, and so that when M4 introduces Vapi, it's wiring up *already-correct* configuration rather than inventing it under the added pressure of a live-call integration. Splitting this from Business Profile (M2) also keeps the two concerns cleanly separable long-term: business facts (M2) rarely change and are owned by "the business," while AI configuration (this milestone) is iterated on frequently and is owned by "how the assistant performs."

**Features:**
- Tenant can configure, per assistant-to-be: greeting message, voice selection, a draft system prompt (plain text at this stage — full templating/versioning is M6), personality/tone setting (e.g., formal/friendly/concise — a small set of platform-defined options at this stage, not yet a fully generalized trait system), escalation rules (when to hand off), transfer numbers (one or more real phone numbers calls can be routed to), and supported languages.
- All of this is purely a database record at this point — nothing is sent to Vapi yet, and no real call can use it. That's intentional: this milestone is about getting the *shape and correctness* of AI configuration right in isolation.

**Database changes:**
- `ai_configurations` table, one row per (future) assistant, referencing `organization_id`: `greeting_message`, `voice_id`/`voice_provider` (stored as a reference to a platform-curated voice catalog, not yet a live Vapi voice), `draft_system_prompt` (plain text — the precursor to the full `prompt_versions` model in M6), `personality` (enum from a fixed platform list), `escalation_rules` (jsonb: conditions + target), `transfer_numbers` (array of validated E.164 numbers with labels, e.g. "Manager," "After-hours"), `supported_languages` (array from a supported-languages list).
- Deliberately *not* introducing `assistants`/`prompt_versions`/`phone_numbers` yet — those are Vapi-facing concepts introduced in M4, once there's something real to connect them to. This keeps this milestone's schema honest about what it actually is: draft configuration, not a live assistant.

**Backend work:**
- AI configuration CRUD endpoints, same validation-sharing pattern as M2 (`packages/shared-types`).
- Voice catalog endpoint: a small, platform-maintained list of available voices (name, sample description) that the frontend can render as a picker — no live Vapi call needed to populate this; it can be a static/config-driven list at this stage, refined once M4 wires up real Vapi voices.
- Transfer number validation (E.164 format, uniqueness within the org).

**Frontend work:**
- Settings → AI Receptionist page (or "Assistant Configuration"): greeting text field, voice picker (with sample playback if feasible), prompt draft textarea, personality selector, escalation rules builder (simple condition/target UI at this stage), transfer numbers list (add/edit/remove with labels), language multi-select.
- A "Preview" panel that renders the effective greeting/prompt as plain text — not a real call, just a readability/sanity check for the tenant before anything goes live in M4.

**Vapi work:**
- None. Confirming this is the entire point: by the end of this milestone, the team has proven both business data (M2) and AI-behavior data (this milestone) can be created, edited, and validated entirely within our own platform — so M4 only has to solve "how do we get already-correct data to Vapi," not "what does this data even look like."

**Definition of Done:**
- A tenant can configure greeting, voice selection, draft prompt, personality, at least one escalation rule, at least one transfer number, and supported languages, save, reload, and see everything persisted correctly.
- Validation rejects invalid transfer numbers and incomplete escalation rules with clear errors.
- A second tenant's AI configuration is verifiably isolated from the first (same RLS test pattern as M1/M2, applied to a third table — three-for-three confirms the pattern is solid before Vapi is introduced).
- AI configuration data, together with the M2 business profile, is available via internal API in a shape M4 can consume directly to provision a real Vapi assistant without any schema changes.

---

## M4 — First End-to-End Vapi Call Loop

**Goal:** Prove the hardest, riskiest integration — a real inbound phone call handled by a Vapi assistant that our platform provisioned and owns — now that the business profile (M2) and AI configuration (M3) it depends on already exist and are already correct. This milestone's job is narrowly "take already-good data and make Vapi answer a real call with it," not "figure out what the data should be" — that separation is the whole reason M2/M3 came first.

**Features:**
- A tenant's M3 AI configuration is published: a real Vapi assistant is created using the greeting, voice, and draft prompt from M3, and a real phone number is provisioned and linked (distinct from, but referencable alongside, the business's own public number captured in M2).
- Calling that number reaches the live Vapi assistant behaving according to the tenant's configuration.

**Database changes:**
- `assistants` (links `ai_configurations` → `vapi_assistant_id`), `phone_numbers`, each with `sync_status`/`last_synced_at`/`last_sync_error`.
- `prompt_versions` introduced now, seeded from `ai_configurations.draft_system_prompt` on first publish — this is the bridge from M3's simple draft-text model into the versioned model M6 will build out fully, so no data is re-entered, only re-modeled.
- `vapi_sync_jobs` table (outbox pattern, per TDD §9.6) — introduced in this milestone because this is where Vapi enters the picture at all, and it's the pattern every later Vapi-touching milestone (M6 publish, M7 tool registration) will reuse rather than reinvent.

**Backend work:**
- `packages/vapi-client`: typed wrapper for assistant create/update and phone number assignment — the abstraction boundary described in the TDD, established now while the surface is small, so it's a natural home (not a refactor) as capability grows.
- **DB-first write path established here, once, for good:** the "Publish Assistant" endpoint reads the current `business_profiles` + `ai_configurations` rows, writes an `assistants`/`prompt_versions` record, and returns success immediately, with `sync_status = pending`; it never calls Vapi inline. A separate Vapi-sync worker consumes `vapi_sync_jobs` and performs the actual Vapi API call, with retry/backoff and idempotent "make Vapi match our DB" semantics (TDD §9.6). This is the single most important thing to get right in this milestone — every later milestone that talks to Vapi (M6, M7, M11) copies this pattern rather than inventing its own.
- Rendering logic that composes the Vapi assistant payload from M2 business profile fields (business name, hours, timezone) and M3 AI configuration fields (greeting, voice, draft prompt, transfer numbers) — an early, simple version of what becomes the full `prompt-engine` package in M6.
- `apps/webhooks` service created now (even though M5 is where it earns its keep) with a bare-minimum Vapi webhook signature verification endpoint that just logs receipt — needed to receive Vapi's status callbacks confirming provisioning succeeded.

**Frontend work:**
- "Publish" action on the AI Receptionist page (M3) that becomes live once this milestone ships, plus a phone number display once assigned.
- **Sync status indicator** next to the assistant and phone number (synced / syncing / pending / failed-with-retry) — the save button in M3 already confirmed the database write; this indicator is what tells the customer whether it's actually live on the phone system yet.

**Vapi work:**
- Live assistant creation via Vapi API from our platform (not the Vapi dashboard), using M2/M3 data.
- Live phone number provisioning/assignment via Vapi API.
- Manual end-to-end test: call the number, confirm the assistant answers with the configured greeting/prompt/voice from M3, referencing business details from M2 (e.g., stating correct opening hours).
- **Resilience test**: simulate Vapi being unreachable (block the API or use an invalid key temporarily) and confirm the dashboard save still succeeds, the entity sits in `pending`/`failed` sync status, and restoring Vapi access causes the queued job to catch up automatically without any customer action.

**Definition of Done:**
- From our dashboard, a tenant can publish their M2/M3 configuration and receive a real phone call answered according to it — with zero manual Vapi-dashboard steps.
- Publishing is idempotent and re-publishable (editing M3's config and republishing updates the live assistant correctly).
- Two different tenants' assistants are verifiably isolated (calling tenant A's number never touches tenant B's config).
- With Vapi deliberately made unreachable, a customer can still edit M2/M3 data and click Publish with no error and no data loss; once Vapi access is restored, the queued sync job completes automatically and the dashboard's sync-status indicator reflects the outcome without a page refresh or manual retry.

---

## M5 — Webhook Ingestion, Call Storage & Call Log

**Goal:** Capture everything that happens on a call durably and make it visible — this must exist before prompt iteration, KB, or analytics are meaningful, since all of those need real call data to work with and test against.

**Features:**
- Every call (start, end, status changes) is recorded.
- Tenant can see a call log: who called, when, how long, status.
- Tenant can play back the recording and read the transcript for any call.

**Database changes:**
- `calls`, `call_events` (append-only raw event store), `call_transcripts`.
- Time-based partitioning strategy applied to these three tables now, even at low volume — partitioning an empty/small table is trivial; retrofitting it under production load later is not.

**Backend work:**
- Flesh out `apps/webhooks`: full HMAC verification, tenant resolution via `vapi_call_id`/phone-number mapping, raw event persistence before any processing (per TDD §10).
- Job queue (BullMQ/Redis) introduced; async workers (`apps/workers`) process end-of-call reports: populate `calls` metadata, fetch/store recording to S3, store transcript.
- Idempotent event handlers (safe against Vapi's at-least-once delivery).
- Signed URL generation for recording playback.
- Call list/detail API endpoints with cursor pagination.

**Frontend work:**
- Calls list page (filter by date/status), call detail page (transcript viewer, audio player).

**Vapi work:**
- Configure Vapi webhook subscriptions (status-update, end-of-call-report) pointing at `apps/webhooks`.
- Confirm real calls generate the expected event sequence and that our stored transcript/recording match what actually happened on a live test call.

**Definition of Done:**
- A live call to any tenant's assistant results in a correctly attributed row in `calls`, a full transcript, and a playable recording, visible in that tenant's dashboard within seconds of call end.
- Killing/restarting the webhook service mid-burst does not lose events (verified via a chaos test: send N webhook events, kill the consumer, confirm all N are eventually processed).
- Raw `call_events` are retained and a call can be fully reconstructed/reprocessed from them alone.

---

## M6 — Prompt Management & Versioning

**Goal:** Now that there's a working call loop and real call data to validate against, replace the "one draft prompt field" from M3/M4 with the full templated, versioned system described in the TDD, and make it automatically reference the M2 Business Profile — this is the payoff of splitting Business Profile out early: the prompt-engine composes business facts (hours, address, emergency contact) with AI configuration (personality, escalation) without either being re-entered as prompt text.

**Features:**
- Prompt templates with variables (business name, hours, escalation number, etc.) resolved automatically from the `business_profiles` record (M2) and `ai_configurations` record (M3) — no separate data entry, and no duplicate source of truth for this information.
- Version history per assistant; diff between versions; publish/rollback.
- Platform-curated starter templates by vertical.
- Test-call flow before publish.

**Database changes:**
- `prompt_templates` fully modeled (platform-global + org-specific).
- `prompt_versions` extended with `variables` (jsonb schema), `tool_definitions` (jsonb, unused until M7 but modeled now so the version record is complete from day one), `is_published` — building on the seeded rows created in M4, not replacing them.

**Backend work:**
- `prompt-engine` package: template + variable + business-profile/AI-configuration composition logic (per TDD §11.4), fully deterministic rendering — formalizing the simple composition logic introduced ad hoc in M4.
- Version create/publish/rollback endpoints; diffing logic. Publish reuses the M4-established DB-first, async-sync pattern exactly: publishing a version writes `is_published = true` and `sync_status = pending` immediately, enqueues a `vapi_sync_jobs` row, and the existing Vapi-sync worker (not a new one) picks it up — no new sync mechanism is built here.
- Extend assistant publish flow to render from the prompt-engine rather than the M4 ad hoc composition.

**Frontend work:**
- Prompt editor with variable placeholders, version history list, diff viewer, publish/rollback actions, "starter template" picker on assistant creation.
- Test-call trigger UI (places a real or simulated call using the draft version).

**Vapi work:**
- No new Vapi capabilities required — this milestone is entirely about what we send to the existing assistant-update API, but with much richer, versioned, variable-resolved content.

**Definition of Done:**
- A tenant can start from a vertical template, customize it, publish, make a real test call, see the version in history, edit again, and roll back to a prior version with the live assistant actually reverting.
- Changing a Business Profile field (e.g., opening hours) and republishing correctly updates what the assistant says on a real call, without the tenant re-typing that fact into the prompt.
- Two published versions produce demonstrably different assistant behavior on a real call, provable via the transcript captured in M5.

---

## M7 — Tool/Function Bridge & First Live Integration (Calendar)

**Goal:** Prove the mid-call, synchronous "assistant calls out to our business logic" seam — the architectural piece that makes this more than a scripted voicebot — using one concrete, high-value integration (calendar booking) before generalizing to a plugin system.

**Features:**
- Tenant connects a Google Calendar (or similar) account.
- Assistant can check availability and book an appointment live, during a call.
- Booked appointments appear in the dashboard and on the tenant's real calendar.

**Database changes:**
- `integrations`, `integration_events`.
- `call_tool_invocations` (per TDD §4.4) to log every tool call made during a call: latency, success/failure, payload.

**Backend work:**
- OAuth connect flow for the calendar provider, credentials stored via Secrets Manager reference (never raw tokens in DB).
- Function/tool registration: calendar integration registers `check_availability`/`book_appointment` as Vapi tool definitions on the relevant `prompt_versions.tool_definitions`. This registration is itself just a DB write followed by the same `vapi_sync_jobs` outbox flow from M4/M6 — connecting an integration never blocks on a live Vapi call either.
- Synchronous webhook handler in `apps/webhooks` for the mid-call function-call event: executes the calendar API call within Vapi's latency budget, returns result. (Note: this mid-call path is intentionally the one place that *is* synchronous and latency-sensitive — it's a live conversation, not a config save — and is architecturally distinct from the config-sync pattern used everywhere else.)
- Error handling/fallback behavior if the integration call fails or times out mid-call (must degrade gracefully, e.g., assistant offers to have someone call back, optionally using an M3 transfer number).

**Frontend work:**
- Integrations page: connect/disconnect calendar, view connection status/last sync.
- Call detail page extended to show tool invocations (what was checked/booked, latency, success) alongside the transcript.

**Vapi work:**
- Register real function/tool schemas on the assistant.
- Live test: a real call in which the assistant checks availability and books a real appointment, verified against the actual connected calendar.

**Definition of Done:**
- A real inbound call results in a real appointment being created in the tenant's connected calendar, entirely through assistant-initiated tool calls, with the full interaction visible in the call detail view.
- Simulated integration failure (revoke token mid-call) is handled without crashing the call or leaving the caller stuck.

---

## M8 — Knowledge Base

**Goal:** Add the RAG/KB capability now that both the tool-call bridge (M7) and prompt composition (M6) exist, since KB retrieval is architecturally "just another tool call" and pre-baked KB context is "just another prompt-engine input" — this milestone slots into two seams that already exist rather than inventing new ones.

**Features:**
- Upload documents (PDF/DOCX/TXT) or paste text as a knowledge source.
- Assistant answers questions using the KB, either via pre-baked context (small KBs) or live retrieval (larger KBs).
- Sync/staleness status visible in dashboard.

**Database changes:**
- `knowledge_bases`, `kb_documents`, `kb_chunks` (with pgvector extension enabled), `kb_sync_jobs`.

**Backend work:**
- Ingestion pipeline: upload → S3 → text extraction → chunking → embedding → `kb_chunks`, run as async worker jobs.
- Threshold logic: small KB → summarized into prompt-engine composition (M6's rendering pipeline); large KB → registered as a `search_knowledge_base` tool (M7's bridge pattern), scoped by `organization_id` on every query.
- Re-embedding on document edit (delta only, not full KB).

**Frontend work:**
- Knowledge base page: upload/manage documents, sync status indicators, simple "test a question" search box for tenants to sanity-check retrieval quality.

**Vapi work:**
- Register the `search_knowledge_base` function for large-KB tenants.
- Live test calls verifying both the pre-baked and live-retrieval paths answer correctly and that KB content never leaks across tenants.

**Definition of Done:**
- A tenant can upload a document and, within the sync pipeline's expected time, have a live call correctly answer a question sourced from it.
- Cross-tenant isolation test: tenant A's KB content is never retrievable via tenant B's assistant, even under adversarial prompting.

---

## M9 — Operational Analytics Dashboard

**Goal:** With several milestones' worth of real call, tool, and KB data now flowing through the system, build the fast Postgres-rollup analytics tier described in the TDD — deliberately deferred until there's enough real data shape to validate the metrics against, avoiding designing dashboards around guessed data.

**Features:**
- Overview page: call volume, answer rate, average handle time, outcome distribution, sentiment trend.
- Per-assistant breakdowns.
- Basic CSV export.

**Database changes:**
- `usage_records` introduced (feeds M10 billing).
- Materialized views / scheduled rollup tables for the metrics above.
- `calls.outcome_tag` and `calls.sentiment_score` populated by a new scoring worker job.

**Backend work:**
- Call-scoring worker: post-call classification (outcome tagging, sentiment) run as an async job off the transcript.
- Rollup jobs (scheduled, e.g., every few minutes) aggregating into fast-read tables.
- Analytics API endpoints (overview, by-outcome, by-assistant, export).

**Frontend work:**
- Analytics overview page, charts (volume over time, outcome pie/bar, sentiment trend), export button.

**Vapi work:**
- None new — this milestone consumes data already captured, no additional Vapi surface needed.

**Definition of Done:**
- Dashboard analytics numbers are verifiably consistent with the underlying `calls`/`call_events` data for a manually spot-checked sample.
- Rollups refresh within the target latency (e.g., 5 minutes) without measurably degrading transactional API performance.

---

## M10 — Billing & Usage Enforcement

**Goal:** Now that real usage (call minutes, per-tenant volume) is measurable via M9's infrastructure, wire it to actual plan enforcement and payment — deliberately after usage data exists and is trustworthy, not before, so billing isn't built against synthetic assumptions.

**Features:**
- Plan selection at signup/upgrade.
- Usage vs. plan-included-minutes shown in dashboard.
- Overage handling (soft cap warning, hard cap block, or metered overage billing — product decision to confirm).
- Stripe-based subscription and invoicing.

**Database changes:**
- `plans` fleshed out (features/limits jsonb), `organizations.plan_id` enforced, `usage_records` wired to real-time counters.

**Backend work:**
- Stripe integration (subscriptions, webhooks for payment events — reusing the `apps/webhooks` signature-verification pattern from M5).
- Usage-limit enforcement middleware (block/warn based on plan thresholds), driven off `usage_records` counters updated as calls complete.
- Plan upgrade/downgrade flow.

**Frontend work:**
- Billing page: plan, usage bar vs. included minutes, invoice history, upgrade flow.

**Vapi work:**
- None new — billing consumes Vapi-derived usage data already captured, no new Vapi API surface.

**Definition of Done:**
- A tenant exceeding their plan's included minutes sees an accurate warning/block per the configured policy, and Stripe reflects correct subscription/invoice state.
- Simulated payment failure correctly suspends/flags the organization per defined business rules.

---

## M11 — Notifications & Additional Integrations (CRM, SMS, Slack)

**Goal:** Generalize the integration pattern proven in M7 (calendar) into the full plugin architecture from the TDD, and add tenant-facing notifications — deliberately after the core loop, prompt system, KB, analytics, and billing are stable, since integrations are additive and shouldn't block the core product's readiness.

**Features:**
- Notification preferences (missed call alert, daily summary) via email/SMS/Slack.
- CRM integration (HubSpot/Salesforce) — assistant can log a call/contact, tenant sees synced records.
- SMS follow-up capability (Twilio) triggered post-call.

**Database changes:**
- Extend `integrations`/`integration_events` usage to new providers (schema already supports this per TDD §15's plugin design — validates that earlier design choice).
- `notification_preferences` table.

**Backend work:**
- Common integration interface implementations for each new provider (`connect/disconnect/sync/handleWebhook/getAvailableTools`), reusing the OAuth and tool-registration patterns from M7.
- Notification dispatch worker (email/SMS/Slack sends triggered off call-completion events).

**Frontend work:**
- Settings → Notifications page.
- Integrations page extended with the new providers using the same UI pattern established in M7.

**Vapi work:**
- Additional tool registrations per new integration where relevant (e.g., "log this call to CRM").

**Definition of Done:**
- Each new integration can be connected, used live on a real call where applicable, and disconnected cleanly, following the exact plugin pattern validated in M7 (proving that pattern generalizes without rework).
- Notification delivery confirmed for each configured channel on a real triggering event.

---

## M12 — Security Hardening, Compliance & Data Lifecycle

**Goal:** Formalize retention, redaction, and audit maturity across everything built so far — placed here deliberately, after enough real functionality and data exist to test these controls meaningfully, but before scale-driven infra changes (M13) make retroactive changes more expensive.

**Features:**
- Configurable per-tenant/plan data retention (recordings/transcripts).
- PII/PCI-pattern redaction hooks on transcripts (opt-in per vertical).
- Customer-initiated call/data deletion ("right to be forgotten").
- Full audit log coverage review across all sensitive actions (recording playback, config changes, impersonation).

**Database changes:**
- Retention policy fields on `organizations`/`plans`.
- Redaction status fields on `call_transcripts`.
- Scheduled purge job bookkeeping table.

**Backend work:**
- Scheduled retention-purge job (partition-drop based, per TDD §13.3).
- Redaction worker (pattern-based scan/mask on transcripts).
- Deletion request handling (cascades correctly across `calls`, `call_events`, `call_transcripts`, S3 objects).
- Audit log completeness pass across all admin/impersonation actions in `apps/admin`.

**Frontend work:**
- Settings → Data retention controls.
- "Delete this call" / "Delete my data" actions surfaced appropriately.

**Vapi work:**
- None new.

**Definition of Done:**
- Retention purge correctly removes data past the configured window in a staging test without affecting in-window data.
- A deletion request removes all associated data (DB + S3) and is provably irreversible, logged in `audit_logs`.

---

## M13 — Scale-Out Infrastructure

**Goal:** With a feature-complete, secure platform validated at moderate volume, invest in the scaling levers flagged throughout the TDD (§18) — deliberately last, since premature infra scaling (extra DBs, warehouses, vector store swaps) before the product is stable would be wasted or wrongly-shaped effort.

**Features:** None new customer-facing; this milestone is about headroom, not features.

**Database changes:**
- Read replica(s) for analytics/reporting traffic.
- Confirm/adjust partitioning strategy against real production volume.
- Evaluate pgvector performance against real KB volume; migrate to a dedicated vector store if thresholds are hit (interface already isolated per TDD §12.4/§18).

**Backend work:**
- Stream `call_events` into the warehouse (ClickHouse/BigQuery) for heavy historical reporting, offloading from operational Postgres per TDD §14.
- Graduate queue infrastructure from Redis/BullMQ to Kafka/SQS if volume/ordering needs demand it (payload contracts designed in M5 to make this a transport swap, not a rewrite).
- Per-tenant real-time cost/usage capping refinement (protect against runaway tool-calling loops or telephony cost spikes).

**Frontend work:**
- "Reports" section backed by warehouse queries, distinct from the fast operational Overview built in M9.

**Vapi work:**
- Load-test the full call pipeline against realistic concurrent-call volume; confirm webhook ingestion holds up under burst per the chaos test pattern established in M5.

**Definition of Done:**
- Load test simulating a target concurrent-call volume (e.g., N simultaneous calls across multiple tenants) passes with no dropped webhook events and acceptable p95 latency on tool calls.
- Analytics/reporting queries against the warehouse show no measurable impact on transactional API latency.

---

## Summary Table

| # | Milestone | Core Risk Retired |
|---|---|---|
| M0 | Platform foundations | Infra/CI/CD exists; Vapi account works at all |
| M1 | Tenancy, auth, org management | Multi-tenant isolation is correct before any tenant data exists |
| M2 | Business Profile | Dashboard → DB → sync pattern proven on pure business data, zero AI/Vapi risk |
| M3 | AI Receptionist Configuration | Dashboard → DB pattern re-proven on AI-specific data; config is correct *before* Vapi enters the picture |
| M4 | First end-to-end Vapi call loop | The core value prop (a real AI-answered call) works, provisioned from already-correct M2/M3 data |
| M5 | Webhook ingestion, call storage, call log | Call data is captured durably and visibly, nothing is ever silently lost |
| M6 | Prompt management & versioning | Prompt iteration is safe and auto-references Business Profile, before customers rely on it |
| M7 | Tool bridge + calendar integration | The synchronous mid-call integration seam works, proven end-to-end |
| M8 | Knowledge base | RAG capability slots into existing seams (tool bridge + prompt engine) |
| M9 | Operational analytics | Dashboards built against real, validated data shapes |
| M10 | Billing & usage enforcement | Monetization built on trustworthy usage data |
| M11 | Notifications & further integrations | Plugin pattern generalizes without rework |
| M12 | Security hardening & data lifecycle | Compliance retrofitted while still cheap, before scale-out |
| M13 | Scale-out infrastructure | Headroom added last, shaped by real production signals, not guesses |

**Note on parallelization:** Within a single milestone, frontend and backend work can generally proceed in parallel once the API contract (OpenAPI/Zod schema) for that milestone is agreed — this doesn't change the milestone *ordering* above, only team-level scheduling within each one.

**Note on the M2/M3/M4 split:** This is the most important structural change from earlier drafts of this roadmap. Business Profile (M2) and AI Configuration (M3) are now fully built, editable, and validated — including their own tenant-isolation tests — entirely without Vapi. Only once that data is known-good does M4 introduce the platform's single riskiest external dependency, and it does so with a narrow, well-defined job: render already-correct data into a live assistant. This also pays off structurally in M6, where the prompt-engine can compose Business Profile facts and AI Configuration settings automatically, exactly the way a tenant would expect ("the assistant should just know our hours") without either data set having been designed with prompts in mind from the start.
