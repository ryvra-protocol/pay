# PR8 Boundary Adoption Notes (Pay)

## Stage classification

- **Stage before this PR:** `pre-adoption`
- **Evidence (before change):**
  - AA only referenced at a high level in README (`accounts` dependency), with no boundary execution contract.
  - PR7 notes explicitly left account-abstraction orchestration out of scope.
  - No AA/userOp fields in payment intent or payment event tracking surfaces.
  - No deterministic AA boundary tests.

## PR8 adoption checklist

- [x] Add optional ERC-4337 boundary execution mode for payment intents/payouts.
- [x] Map payment intents to AA-capable execution requests through accounts-facing boundary adapter.
- [x] Support `user_op_hash` in payment tracking surfaces.
- [x] Preserve non-AA legacy execution path compatibility.
- [x] Validate chain/account/asset sponsorship compatibility at boundary ingress.
- [x] Add deterministic tests for:
  - [x] AA-enabled happy path
  - [x] fallback to legacy path
  - [x] boundary validation failures

## Explicit compatibility statement

Legacy non-AA path is preserved: if AA execution mode is not supplied, mapping remains `legacy` and existing payment service/state-machine behavior is unchanged.
