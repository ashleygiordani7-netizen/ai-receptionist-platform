# Implementation Review Prompt

Read and follow:

- `PROJECT_RULES.md`
- `docs/AI_WORKFLOW.md`

Review the completed implementation for:

Task:

{{TASK_DESCRIPTION}}

Check:

## Scope

- Does this belong to the current milestone?
- Was any future milestone work introduced?
- Were unrelated files changed?

## Architecture

- Does it follow the project architecture?
- Are responsibilities correctly separated?
- Are dependencies pointing in the correct direction?
- Are external providers isolated?

## Code Quality

- Is the code maintainable?
- Is duplication avoided?
- Are abstractions justified?
- Are names clear?
- Is the implementation simple?

## Security

Check:

- Authentication
- Authorization
- Tenant isolation
- Input validation
- Secrets handling
- Error handling

## Testing

Check:

- Appropriate tests exist.
- Tests verify behaviour.
- Tests are deterministic.
- Edge cases are covered.

Provide:

1. Findings
2. Required changes
3. Approval recommendation
