# Ryvra Pay

Ryvra Pay is the programmable stablecoin rails module for payouts, collections, and treasury flows on Ryvra.

## Purpose

Ryvra Pay provides policy-aware payment orchestration for:

- payouts
- collections
- treasury transfers

It integrates cleanly with:

- `accounts` (AA)
- `asset-registry`
- `ledger-settlement`
- `policy-risk`

## Architecture overview

`client/API -> pay service -> policy decision -> ledger posting -> settlement state updates`

Canonical alignment baseline:

- payment states: `created | authorized | executing | settled | failed | reversed`
- idempotency deduplication key: `reference_id + idempotency_key`
- policy `DENY` decisions require non-empty machine-readable `reason_codes`
- event envelope fields: `event_id`, `correlation_id`, `reference_id`, `event_type`, `timestamp`, `payload`

## Status

**Status: early draft / not production-ready.**

Subject to policy/legal review.

## Quickstart

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Dependency contracts

Ryvra Pay depends on external contracts and service interfaces with:

- `accounts`: account identity and authorization context
- `asset-registry`: supported assets and transfer constraints
- `ledger-settlement`: posting and settlement finality data
- `policy-risk`: policy and risk decisions at authorization and execution points
