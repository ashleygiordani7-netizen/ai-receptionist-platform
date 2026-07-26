# AI Development Workflow

This document defines how AI coding agents should work within this repository.

The goal is to ensure AI-assisted development follows the same standards as human engineering work.

---

# Source of Truth

Before performing any work, AI agents must read:

1. `PROJECT_RULES.md`
2. Relevant sections of:
   - Technical Design Document (TDD) in docs/TDD.md
   - Milestone Roadmap in docs/MILESTONE-ROADMAP.md
   - Existing ADRs

These documents define:

- Architecture decisions
- Engineering standards
- Development constraints
- Current milestone scope
- Testing expectations

If there is a conflict between instructions, stop and explain the conflict before making changes.

---

# Development Process

All work follows this sequence:

Task Request
↓
Understand Requirements
↓
Review Documentation
↓
Create Implementation Plan
↓
Human Approval
↓
Implementation
↓
Verification
↓
Review
↓
Commit
↓
Next Task

Do not skip stages.

---

# 1. Planning Phase

Before writing code:

AI agents must:

- Understand the requested task.
- Review relevant architecture documentation.
- Confirm the task belongs to the current milestone.
- Identify affected areas.
- Identify dependencies.
- Identify risks.
- Propose an implementation approach.

The output should include:

- Summary of understanding.
- Proposed approach.
- Files expected to change.
- Dependencies required.
- Testing approach.
- Architectural decisions requiring approval.

No code should be written during planning.

---

# 2. Approval Phase

AI agents must wait for approval before implementation.

Approval should confirm:

- The approach is accepted.
- Architectural decisions are accepted.
- Scope is clear.
- Any alternatives have been resolved.

If requirements change after approval, return to planning.

---

# 3. Implementation Phase

During implementation:

AI agents must:

- Implement only the approved plan.
- Avoid unrelated refactoring.
- Avoid introducing future milestone work.
- Follow existing project patterns.
- Keep changes focused.
- Prefer simple solutions.
- Avoid unnecessary dependencies.

Before adding dependencies:

Consider:

- Can existing code solve this?
- Is the dependency maintained?
- Is it required now?
- Does it introduce unnecessary complexity?

---

# 4. Verification Phase

Before declaring work complete:

AI agents must verify:

- Code builds successfully.
- Tests pass.
- New behaviour has appropriate tests.
- Existing behaviour is preserved.
- No unrelated functionality changed.

Where applicable run:

- Lint
- Typecheck
- Unit tests
- Integration tests
- Build
- Relevant runtime verification

Report:

- Commands executed.
- Results.
- Any limitations.

---

# 5. Commit Guidelines

Commits should be:

- Focused.
- Atomic.
- Easy to review.

A commit should represent one logical change.

Avoid:

- Mixing unrelated fixes.
- Large cleanup commits.
- Formatting-only changes mixed with features.

Commit messages should clearly describe the change.

Example:

feat(api): add health check endpoint

---

# Architectural Decision Process

When introducing significant decisions:

AI agents must:

1. Identify the decision.
2. Explain alternatives.
3. Explain trade-offs.
4. Recommend an approach.
5. Wait for approval if the decision affects architecture.

Examples:

- Framework choices.
- Database decisions.
- New infrastructure.
- New dependencies.
- Major folder structures.

---

# Scope Discipline

AI agents must not:

- Implement future milestones.
- Add "nice to have" features.
- Refactor unrelated areas.
- Introduce abstractions without current need.
- Build infrastructure before it is required.

If a future improvement is identified:

- Mention it.
- Document it as follow-up work.
- Do not implement it.

---

# Handling Ambiguity

When requirements are unclear:

Do not guess.

Instead:

1. Explain the ambiguity.
2. Present possible interpretations.
3. Recommend an option.
4. Ask for clarification.

---

# Testing Expectations

AI agents should:

- Add tests alongside features.
- Prefer behaviour testing.
- Keep tests deterministic.
- Add regression tests for bugs.
- Avoid weakening tests to make them pass.

A feature is incomplete without appropriate verification.

---

# Completion Report

Every completed task should include:

## Summary

What changed.

## Architecture

Important decisions made.

## Files Changed

List modified files.

## Dependencies

New or changed dependencies and reasons.

## Testing

Commands run and results.

## Scope Check

Confirm:

- Current milestone only.
- No future work introduced.
- No unrelated refactoring performed.

## Follow-up

List future improvements without implementing them.
