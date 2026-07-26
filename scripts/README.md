# scripts

One-off and repeatable developer/ops scripts that don't belong inside a
specific app or package (e.g. environment bootstrap, database seed/reset
helpers, release helpers).

## Rules

- Scripts here should be safe to read and run without surprises — no
  destructive operations without an explicit confirmation step or a
  `--dry-run` default.
- Prefer a small, well-named script over a large one that does several
  unrelated things.

## Status

Empty. No scripts exist yet. Added as real, recurring developer needs
emerge — not written speculatively ahead of need.
