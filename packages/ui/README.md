# @platform/ui

The shared design system. The single source of truth for reusable UI primitives,
design tokens, and layout components used by `apps/dashboard` (and, later, any
other customer-facing surface).

## Rules

- Every reusable UI primitive lives here — apps should not define their own
  buttons, inputs, cards, modals, etc.
- Components in this package are presentational only: they render UI and
  accept props. They must never fetch data, call APIs, or contain business
  logic.
- Prefer composition (compound components) over large configuration-object
  props.
- Design tokens (spacing, typography, color) live here, not hardcoded in
  consuming apps.

## Status

Placeholder only. No components exist yet. Populated starting with the
milestone that first needs dashboard UI.
