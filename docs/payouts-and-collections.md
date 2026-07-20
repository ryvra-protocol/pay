# Payouts, Collections, and Treasury Flows

## Payout flow

### Single payout

1. Create intent (`kind=payout`, state `created`)
2. Authorize via policy/risk (`authorized`)
3. Execute with ledger request (`executing`)
4. Confirm settlement (`settled`) or emit failure (`failed`)

### Batch payout

1. Submit batch envelope with per-item idempotency keys
2. Validate limits/risk at batch and item levels
3. Execute item intents independently
4. Produce per-item final states and batch summary outcome

## Collection flow

1. Create collection intent (`created`)
2. Policy authorization (`authorized`)
3. Execute debit/credit posting (`executing`)
4. Finalize (`settled`) or fail (`failed`)

## Treasury/internal transfer flow

1. Create treasury transfer intent (`created`)
2. Policy checks for limits, destination class, and time windows
3. Execute internal ledger transfer (`executing`)
4. Mark final state (`settled`/`failed`), with `reversed` allowed for compensation

## Limits and risk controls

Examples:

- velocity limits (per account/day)
- amount thresholds
- blocked destinations/assets
- policy-triggered step-up approval requirements

All controls are subject to policy/legal review.

## Reason code and transition examples

| Scenario | Reason Code | Transition |
| --- | --- | --- |
| Standard payout success | `PAYOUT_OK` | `created -> authorized -> executing -> settled` |
| Policy denial | `POLICY_DENY_LIMIT` | `created -> failed` |
| Execution rail timeout | `RAIL_TIMEOUT` | `authorized -> executing -> failed` |
| Post-settlement correction | `REVERSAL_REQUESTED` | `settled -> reversed` |
