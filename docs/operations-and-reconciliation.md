# Operations and Reconciliation

## Reconciliation flow

1. Ingest settlement and ledger snapshots
2. Match by correlation IDs (`intentId`, posting reference, settlement reference)
3. Detect mismatches (amount, state, missing acknowledgments)
4. Open reconciliation exceptions with reason code and owner
5. Resolve via replay, compensation, or operational escalation

No destructive edits are allowed; reconciliation actions are append-only events.

## Exception handling

Exception categories:

- missing settlement confirmation
- duplicate idempotency collisions
- unauthorized transition attempts
- ledger/settlement amount mismatch

Each exception should include timestamp, affected intent, severity, and remediation path.

## Settlement timing expectations

- Near-real-time updates are preferred for supported rails.
- Some rails may settle asynchronously; status must remain explicit in state.
- SLOs and rail-specific SLAs are subject to policy/legal review.

## Observability metrics

Track at minimum:

- success rate
- settlement latency
- failed transitions
- duplicate idempotency collisions

Recommended dimensions: asset, rail, flow type (`payout`, `collection`, `treasury_transfer`), and reason code.
