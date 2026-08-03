# Operations and Reconciliation

## Reconciliation flow

1. Ingest settlement and ledger snapshots
2. Match by correlation IDs (`reference_id`, `correlation_id`, settlement reference)
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

- `pay_intent_total`
- `pay_intent_failure_total`
- `pay_reconciliation_mismatch_total`
- `pay_time_to_settlement_ms`

Recommended dimensions: asset, rail, flow type (`payout`, `collection`, `treasury_transfer`), and reason code.

## Playbooks

### Stuck payouts (prolonged `executing`)

1. Confirm idempotency replay safety by checking `reference_id + idempotency_key`.
2. Inspect latest lifecycle events for AA/legacy transition mode and reason code.
3. If reason is settlement latency (`SETTLEMENT_LATENCY_TIMEOUT`), schedule retry and open escalation ticket.
4. Keep intent state explicit (`executing` or `failed`) until settlement confirmation arrives.

### Reconciliation mismatches

1. Run reconciliation against latest settlement snapshot.
2. Classify mismatch reason (`RECON_REFERENCE_MISMATCH`, `RECON_AMOUNT_MISMATCH`, `RECON_ASSET_MISMATCH`, `RECON_STATE_MISMATCH`).
3. Emit reconciliation exception with owner + severity.
4. Resolve by replay, compensation, or manual correction approval.

### Manual remediation

1. Capture exception evidence (intent ID, reference ID, reason code, timestamps).
2. Execute approved remediation action (replay, compensating transfer, or reverse).
3. Record append-only reconciliation event with operator ID and ticket link.
4. Verify mismatch metric and failure metrics return to baseline after remediation.
