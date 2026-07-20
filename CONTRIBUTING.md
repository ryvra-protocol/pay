# Contributing

## RFC-first requirement

Breaking changes to payment intent schema or lifecycle/state semantics must begin with an RFC update/proposal before implementation.

## Test and docs requirements

- Update docs for behavior or contract changes.
- Add/update tests for state transitions, idempotency behavior, and emitted events.
- Keep interfaces backward-aware unless an RFC-approved breaking change is merged.

## Pull request checklist

- [ ] RFC impact reviewed (or explicitly none)
- [ ] docs updated
- [ ] tests updated/added
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] pnpm-only commands and lockfile hygiene preserved
