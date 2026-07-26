# @platform/prompt-engine

Deterministic composition and rendering of the final prompt sent to an
assistant, from stored template + variables + tenant configuration.

## Rules

- Rendering is a pure function of stored data (platform scaffolding +
  vertical template + tenant's Business Profile + tenant's AI Configuration +
  published prompt version). Given the same inputs, it always produces the
  same output — this is what makes prompts reproducible and debuggable.
- This package must never call Vapi or any other external provider directly
  — it only produces the text/config payload that `@platform/vapi-client`
  will later send.
- Business configuration and AI configuration are distinct inputs to this
  package, not a single blob — keeping that separation intact here is what
  lets a business-fact change (e.g. updated opening hours) automatically
  flow into the assistant's behavior without touching AI-specific settings.

## Status

Placeholder only. Implementation begins with the milestone covering full
prompt management and versioning, building on the simpler ad hoc composition
introduced in the first Vapi call-loop milestone.
