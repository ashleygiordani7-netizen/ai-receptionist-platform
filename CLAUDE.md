# Project Rules

This is a production-grade, multi-tenant SaaS AI Receptionist platform.

## Core Principles

- PostgreSQL is the source of truth.
- The dashboard never communicates directly with Vapi.
- Vapi is a replaceable voice provider.
- Every tenant-owned resource belongs to an Organization.
- Business configuration is separate from AI configuration.
- Long-running operations use queues.
- Every configuration change is auditable.
- Build only the current milestone.
- Never implement future milestones early.
- Prefer composition over duplication.
- Keep services small, focused and modular.
- Maintain clean architecture and clear separation of concerns.
- Design for long-term maintainability over short-term speed.

---

# Development Workflow

- Plan before coding.
- Implement one task at a time.
- Wait for approval before moving to the next task.
- Keep commits focused and atomic.
- Never refactor unrelated code during a milestone.
- Follow the Technical Design Document (TDD) and Milestone Roadmap.
- Explain architectural decisions before introducing significant changes.
- Ask for clarification whenever requirements are ambiguous.
- Build incrementally and keep every milestone deployable.
- Every feature must have a clear Definition of Done.
- Prefer simple solutions before introducing abstractions.

---

# Architecture Principles

Maintain strict separation between application layers.

```
Frontend
    ↓
Backend API
    ↓
Application Services
    ↓
Domain Logic
    ↓
Repositories / Data Access
    ↓
External Providers
```

Each layer has one responsibility.

Dependencies should always point downward.

Business logic should never leak into presentation layers.

External providers should never leak into domain logic.

---

# Frontend Engineering Principles

## General

- Build for maintainability, readability and scalability first.
- Keep components small and focused.
- Prefer composition over inheritance.
- Avoid duplicated logic.
- Use strict TypeScript.
- Organise code by feature rather than technical type.
- Prefer readable code over clever code.
- Avoid premature abstraction.
- Abstract only after a clear reuse pattern exists.

---

## Component Design

- Every component has a single responsibility.
- Components should do one thing well.
- UI components render UI only.
- Business logic must never live inside presentational components.
- Avoid God Components.
- Break large components into smaller reusable pieces.
- Keep props simple and strongly typed.
- Prefer composition over configuration.

---

## Custom Hooks

Use custom hooks for:

- Data fetching
- Business logic
- State orchestration
- Side effects
- Data transformation
- Shared behaviour

Components should consume hooks and render data.

Avoid embedding complex logic inside components.

---

## Smart vs Presentational Components

Smart Components:

- Consume hooks
- Coordinate data
- Handle orchestration
- Connect UI to services

Presentational Components:

- Receive props
- Render UI
- Remain reusable
- Remain easy to test

Avoid API calls directly inside UI components.

---

## Compound Components

Use the Compound Component pattern where multiple UI elements belong together.

Examples:

- Forms
- Tables
- Cards
- Dropdowns
- Navigation
- Tabs
- Modals

Avoid large configuration objects when composition produces a cleaner API.

---

## State Management

- Keep state as close as possible to where it is used.
- Do not lift state unnecessarily.
- Separate Server State from Client State.
- Never store derived state.
- Prefer computed values over synchronised state.
- Avoid unnecessary global state.

Server state should use TanStack Query.

---

## React Best Practices

Avoid unnecessary useEffect.

Only use useEffect for genuine side effects.

Examples:

- Browser APIs
- Timers
- Event listeners
- External libraries
- Subscriptions

Do not use useEffect for:

- Derived state
- Filtering
- Sorting
- Mapping
- Simple calculations

---

## Forms

- Use React Hook Form.
- Centralise validation.
- Prefer schema validation.
- Keep reusable form components.
- Keep validation logic separate from UI.

---

## API Communication

UI Components

↓

Custom Hooks

↓

Service Layer

↓

Backend API

↓

Application Services

The frontend must never communicate directly with:

- Vapi
- Stripe
- Google
- Twilio
- Any third-party provider

---

## Styling

- Build reusable UI primitives.
- Use design tokens.
- Maintain consistent spacing.
- Maintain consistent typography.
- Maintain consistent colour palette.
- Avoid inline styles.
- Avoid page-specific CSS where possible.
- Follow the design system.

---

## Performance

Optimise for:

- TTFB
- LCP
- CLS
- INP

Practices:

- Server Components where appropriate
- Dynamic imports
- Lazy loading
- Prefetching
- Image optimisation
- Cache appropriately
- Avoid unnecessary re-renders

Do not prematurely optimise.

---

## Accessibility

Accessibility is required.

- Semantic HTML
- Keyboard navigation
- Screen reader support
- Proper labels
- Focus management
- Colour contrast
- ARIA only when necessary

---

# UX Principles

- Prioritise clarity over visual complexity.
- Every page should have a clear primary action.
- Keep user journeys simple.
- Minimise cognitive load.
- Use progressive disclosure.
- Always provide feedback after user actions.
- Never leave users wondering whether an action succeeded.
- Every page must support:
  - Loading state
  - Empty state
  - Error state
  - Success state
- Destructive actions require confirmation.
- Validation should be immediate and understandable.
- Reduce unnecessary clicks.
- Maintain consistency across the application.

---

# Design System Principles

The Design System is the single source of truth.

Rules:

- Reuse components before creating new ones.
- Extend existing components where appropriate.
- Avoid duplicate components.
- Use consistent spacing.
- Use consistent typography.
- Use consistent iconography.
- Use design tokens instead of hardcoded values.
- Build reusable layout primitives.
- Keep interactions consistent.
- Keep animations subtle and consistent.
- Accessibility is part of the design system.
- Every page should feel like it belongs to the same application.

---

# Backend Engineering Principles

## General

- Build for maintainability.
- Build for scalability.
- Build for reliability.
- Build for observability.
- Use strict TypeScript.
- Keep services independently testable.
- Prefer composition.
- Avoid duplicated business logic.
- Design for external provider failures.
- Keep provider implementations isolated.

---

## Layer Responsibilities

Controller

↓

Application Service

↓

Domain Service

↓

Repository

↓

Database

Controllers should only:

- Validate
- Authenticate
- Authorise
- Delegate
- Return responses

Controllers should never:

- Query databases
- Contain business logic
- Call external providers

---

## Services

Services contain business logic.

Each service should:

- Have one responsibility
- Be independently testable
- Coordinate workflows
- Contain business rules

Avoid God Services.

---

## Database Access

- Controllers never access databases.
- Use repositories.
- Keep Prisma isolated.
- Keep database logic centralised.

---

# Multi-Tenant Principles

Every tenant-owned record belongs to an Organization.

Rules:

- Every query is scoped by Organization.
- Never trust tenant IDs from clients.
- Tenant context comes from authentication.
- Cross-tenant access must be impossible.

Tenant isolation exists in:

- API
- Application
- Database

---

# Authentication & Authorization

Authentication determines:

Who is the user?

Authorization determines:

What may they do?

Rules:

- Backend is always the source of truth.
- Frontend permissions are UX only.
- Separate authentication from authorization.
- Use role-based permissions.

---

# API Design

APIs should be:

- Predictable
- Versioned
- Type-safe
- Consistent
- Documented

Rules:

- Validate every request.
- Consistent responses.
- Consistent error handling.
- Pagination.
- Filtering.
- Sorting.

---

# External Provider Architecture

All providers use adapters.

Application

↓

Provider Interface

↓

Provider Adapter

↓

External API

Supported providers should include:

- Vapi
- Stripe
- Google Calendar
- Microsoft
- HubSpot
- Twilio

Application code should never depend directly on provider SDKs.

---

# Vapi Principles

Vapi is replaceable.

Rules:

- Database is the source of truth.
- Save locally first.
- Sync afterwards.
- Sync failures should retry.
- Dashboard never communicates with Vapi.
- Frontend never contains Vapi logic.

Architecture:

Dashboard

↓

Backend API

↓

Assistant Service

↓

Vapi Adapter

↓

Vapi

---

# Queues & Background Jobs

Queues should handle:

- Webhooks
- Analytics
- AI processing
- Document processing
- Notifications
- Synchronisation
- Email
- Imports
- Exports

Rules:

- Idempotent
- Retryable
- Observable
- Recoverable

---

# Webhooks

Always:

- Verify signatures.
- Store raw payloads.
- Queue processing.
- Process asynchronously.
- Support duplicate events.
- Never assume ordering.

Flow:

Webhook

↓

Validation

↓

Raw Event Store

↓

Queue

↓

Worker

---

# Error Handling

Rules:

- Never swallow errors.
- Log useful context.
- Never expose sensitive information.
- Differentiate user errors from system failures.
- Fail safely.

---

# Logging & Observability

Use structured logging.

Include:

- Request ID
- Correlation ID
- Organization ID
- User ID
- Performance metrics

Never log:

- Passwords
- Tokens
- Secrets
- Sensitive personal data

---

# Database Principles

- Database reflects business ownership.
- Every schema change uses migrations.
- Never manually edit production databases.
- Measure before optimising.
- Index for real queries.
- Avoid destructive migrations.

---

# Security Principles

Security is not optional.

## General

- Never trust user input.
- Validate every request.
- Sanitize user content where appropriate.
- Escape rendered content where appropriate.
- Use parameterized queries.
- Encrypt sensitive data.
- Use HTTPS.
- Apply least privilege.
- Never expose secrets.
- Store secrets in a secrets manager.

## Authentication

- Secure cookies where appropriate.
- Protect against brute-force attacks.
- Rate limit authentication endpoints.
- Rotate secrets when necessary.

## Authorization

- Every endpoint validates permissions.
- Never rely on frontend authorization.
- Verify organization ownership.
- Prevent privilege escalation.

## API Security

- Validate every request.
- Validate webhook signatures.
- Apply rate limiting.
- Never expose stack traces.
- Return safe error messages.

## File Uploads

- Validate file type.
- Validate size.
- Scan uploads where appropriate.
- Store outside the web root.
- Generate signed URLs.

## External Providers

- Handle outages gracefully.
- Retry transient failures.
- Verify signatures.
- Never assume providers are always available.

Before completing any feature ask:

- Can another tenant access this?
- Can permissions be bypassed?
- Can this endpoint be abused?
- Is sensitive data exposed?
- Are secrets protected?

---

# Testing Principles

Testing is a core part of every milestone.

No feature is considered complete without appropriate tests.

## General

- Write tests alongside production code.
- Prefer preventing bugs over fixing bugs.
- Tests should be readable and maintainable.
- Test behaviour rather than implementation details.
- Keep tests deterministic.
- Avoid flaky tests.
- Use descriptive test names.
- Every bug fix should include a regression test.

---

## Unit Tests

Unit tests should cover:

- Business logic
- Services
- Utility functions
- Custom hooks
- Validation
- Data transformations

Unit tests should:

- Be fast
- Not rely on external services
- Mock dependencies appropriately
- Test edge cases
- Test error handling

---

## Component Tests

UI components should be tested for:

- Rendering
- User interactions
- Accessibility
- State changes
- Error states
- Loading states
- Empty states

Presentational components should be easy to test.

---

## Integration Tests

Integration tests should verify:

- API endpoints
- Authentication
- Authorization
- Database interactions
- Repository behaviour
- Provider adapters
- Queue processing
- Webhook processing

Integration tests should use isolated test databases.

---

## End-to-End Tests

Critical user journeys must have E2E tests.

Examples include:

- User registration
- Login
- Organisation creation
- Team invitations
- Assistant creation
- Publishing an assistant
- Receiving a phone call
- Viewing transcripts
- Editing prompts
- Calendar booking
- Knowledge base upload
- Billing workflows

---

## Multi-Tenant Testing

Every tenant-aware feature must include tests proving:

- Tenant A cannot access Tenant B's data.
- Authorization is enforced.
- Organisation isolation cannot be bypassed.
- Queries are correctly scoped.

---

## Security Testing

Test for:

- Authentication failures
- Authorization failures
- Invalid input
- Missing permissions
- SQL injection protection
- Rate limiting
- Webhook signature validation

---

## Performance Testing

Where appropriate test:

- Large datasets
- High concurrency
- Queue throughput
- Pagination performance
- API response times

Avoid performance regressions.

---

## Regression Testing

Whenever a bug is fixed:

- Add a test that reproduces the bug.
- Verify the test fails before the fix.
- Verify the test passes after the fix.

Never fix the same bug twice.

---

## Definition of Done

A task is not complete unless:

- Production code is finished.
- Tests have been written.
- Existing tests pass.
- New tests pass.
- Edge cases have been considered.
- Error handling has been tested.

---

# AI Coding Principles

When generating code:

- Prefer maintainability over fewer lines of code.
- Keep implementations simple.
- Avoid unnecessary dependencies.
- Follow existing project patterns.
- Explain significant architectural decisions.
- Prefer low-maintenance solutions.
- Do not introduce abstractions without clear justification.
- Build incrementally.
- Keep implementations easy for another engineer to understand.
- When multiple solutions exist, recommend the one with the lowest long-term maintenance cost.

---

# Code Quality Principles

Every piece of code should be written as if another engineer will maintain it for years.

## General

- Follow SOLID principles where appropriate.
- Follow the Single Responsibility Principle.
- Avoid God Objects.
- Keep functions small and focused.
- Keep classes focused.
- Prefer composition over inheritance.
- Remove dead code.
- Avoid commented-out code.
- Avoid duplication.
- Name things clearly.
- Favour explicitness over cleverness.

## Readability

Code should be self-documenting.

Avoid comments explaining *what* the code does.

Instead:

- Use good names.
- Extract methods.
- Extract components.
- Extract services.

Comments should explain **why**, not **what**.

## Refactoring

When touching existing code:

- Leave it cleaner than you found it.
- Avoid large refactors during unrelated work.
- Improve incrementally.
- Preserve behaviour.

## Dependencies

Before adding a package ask:

- Can the existing code solve this?
- Is the dependency maintained?
- Is it actively supported?
- Is it worth the maintenance cost?

Prefer fewer dependencies.

---

# Code Review Checklist

Before completing any task verify:

- Does it follow the current milestone?
- Is the responsibility clear?
- Is the code readable?
- Is the code testable?
- Is tenant isolation maintained?
- Are external services abstracted?
- Is business logic in the correct layer?
- Are errors handled correctly?
- Are logs sufficient?
- Are security principles followed?
- Does it follow the design system?
- Is the UX consistent?
- Is accessibility maintained?
- Can another engineer understand this in six months?
- Is this the simplest maintainable solution?
