# RFC-0006: Pay Rails and Payment Intents (v1)

## Status

Draft.

## Scope

This RFC defines the v1 baseline for payment intents, lifecycle handling, policy checks, ledger interaction, and event emission for Ryvra Pay.

## Payment intent model (v1)

A payment intent is an immutable business request with append-only lifecycle updates.

Required fields:

- `intent_id`: globally unique identifier
- `reference_id`: business reference identifier for lifecycle correlation and deduplication
- `idempotency_key`: caller-provided deduplication key
- `kind`: `payout | collection | treasury_transfer`
- `sourceAccountId`
- `destinationAccountId`
- `assetId`
- `amount`
- `reason_code`
- `metadata`
- `created_at`

## Idempotency keys and retry semantics

- Calls creating or advancing intents MUST include an idempotency key.
- The tuple `(reference_id, idempotency_key)` MUST map to a single canonical result for side-effect deduplication.
- Retries with the same tuple MUST return the same success/failure payload without re-executing side effects.
- Retries with same key but different payload MUST fail with an idempotency conflict.
- Idempotency records MUST be retained for a configurable TTL suitable for settlement replay and reconciliation.

## Payment lifecycle states

Canonical states:

- `created`
- `authorized`
- `executing`
- `settled`
- `failed`
- `reversed`

State transitions are append-only events; destructive edits are prohibited.

## Policy checks

Policy checks are required at:

- authorization gate (`created -> authorized`)
- execution gate (`authorized -> executing`)

If policy denies, transition to `failed` with non-empty machine-readable `reason_codes` and policy evidence reference.

## Ledger posting requirements by transition

- `created -> authorized`: no balance movement; record authorization hold/audit marker if required by policy.
- `authorized -> executing`: create ledger execution posting request and persist correlation ID.
- `executing -> settled`: finalize settlement posting and persist settlement reference.
- `executing -> failed`: record execution failure event with compensating requirement marker.
- `settled -> reversed`: post compensating reversal entries, preserving original linkage.

No transition may mutate or delete prior records.

## Webhook/event emission requirements

For each successful state transition, emit at least one event containing:

- `event_id`
- `correlation_id`
- `reference_id`
- `event_type`
- `timestamp`
- `payload`

Delivery requirements:

- at-least-once delivery
- idempotent consumers via `event_id`
- retry with exponential backoff and dead-letter handling

## Failure and compensation model

Failures are represented as explicit terminal or intermediate events.

- `failed`: terminal failure where execution cannot proceed.
- `reversed`: compensation after `settled` via explicit reversal event.

Compensation is event-driven and append-only; no destructive updates are permitted.

## Non-goals

- direct processor/banking integrations
- legal/compliance guarantees (subject to policy/legal review)
