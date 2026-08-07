# Pay API Contract Changelog

This changelog tracks canonical HTTP contract updates for `ryvra-protocol/pay`.

- Contract source of truth: `/openapi/pay.openapi.yaml`
- Versioning strategy: semantic versioning (`info.version`)
- Runtime default version: `PAY_API_VERSION`
- Client version pinning header: `x-pay-api-version`
- Breaking-change policy: major-version increments only, with a minimum 180-day migration window

## 1.0.0 - 2026-08-07

### Added

- Published the first canonical Pay API OpenAPI contract at `/openapi/pay.openapi.yaml`.
- Defined canonical read endpoints:
  - `GET /pay/invoices`
  - `GET /pay/invoices/summary`
  - `GET /pay/payouts`
  - `GET /pay/payouts/summary`
  - `GET /pay/reconciliation/items`
  - `GET /pay/reconciliation/summary`
  - `GET /pay/overview`
- Defined canonical write/transition endpoints:
  - `POST /pay/intents`
  - `POST /pay/intents/{intentId}/transitions`
  - `POST /pay/reconciliation/intents/{intentId}`
- Documented auth requirements, required/optional headers, pagination/filter/sort conventions, error model, enums, and examples.
- Marked `GET /pay/subscriptions` as deprecated (`410 Gone`) in the canonical contract.

### Release note

- Announced publication of the canonical Pay API contract for Apps parity hardening and production integration alignment.
