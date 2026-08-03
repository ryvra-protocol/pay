# PR7 Boundary Migration Notes (Pay)

- Pay boundaries now use canonical unified asset references: `asset.chain`, `asset.asset`, `asset.decimals`.
- Compatibility shim remains available: legacy fields (`assetId`/`asset_id`, `chain`/`chainId`/`chain_id`, `decimals`/`assetDecimals`/`asset_decimals`) are accepted through boundary adapters.
- Use adapters at ingress:
  - `adoptPaymentIntentBoundary(...)`
  - `adoptInvoiceBoundary(...)`
  - `adoptPayoutBoundary(...)`
- Ingress validation now enforces chain/asset/decimals consistency when canonical and legacy fields are both provided.
- PR8 account-abstraction orchestration is intentionally out of scope for this change.
