import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adoptInvoiceBoundary,
  adoptPaymentIntentBoundary,
  adoptPayoutBoundary,
  resolveUnifiedAssetReference
} from '../src/adapters/unified-asset-boundary.js';

test('maps legacy asset fields into PR7 canonical unified asset reference', () => {
  const resolved = resolveUnifiedAssetReference({
    chainId: 'eip155:1',
    assetId: 'usd_stable',
    assetDecimals: 2
  });

  assert.deepEqual(resolved, {
    chain: 'eip155:1',
    asset: 'usd_stable',
    decimals: 2
  });
});

test('accepts canonical and legacy fields when they are consistent', () => {
  const resolved = resolveUnifiedAssetReference({
    asset: {
      chain: 'eip155:1',
      asset: 'usd_stable',
      decimals: 2
    },
    chain_id: 'eip155:1',
    asset_id: 'usd_stable',
    decimals: 2
  });

  assert.deepEqual(resolved, {
    chain: 'eip155:1',
    asset: 'usd_stable',
    decimals: 2
  });
});

test('rejects inconsistent chain between canonical and legacy fields', () => {
  assert.throws(
    () =>
      resolveUnifiedAssetReference({
        asset: { chain: 'eip155:1', asset: 'usd_stable', decimals: 2 },
        chain: 'solana:mainnet',
        assetId: 'usd_stable',
        decimals: 2
      }),
    /inconsistent chain/
  );
});

test('rejects inconsistent decimals between canonical and legacy fields', () => {
  assert.throws(
    () =>
      resolveUnifiedAssetReference({
        asset: { chain: 'eip155:1', asset: 'usd_stable', decimals: 6 },
        chain: 'eip155:1',
        assetId: 'usd_stable',
        decimals: 2
      }),
    /inconsistent decimals/
  );
});

test('adopts payment intent boundary and preserves legacy shim assetId', () => {
  const intent = adoptPaymentIntentBoundary({
    intent_id: 'pi_10',
    reference_id: 'ref_10',
    idempotency_key: 'idem_10',
    kind: 'payout',
    sourceAccountId: 'acct_src',
    destinationAccountId: 'acct_dst',
    chain: 'eip155:1',
    assetId: 'usd_stable',
    decimals: 2,
    amount: '42.00',
    reason_code: 'PAYMENT_PAYOUT_OK',
    state: 'created',
    created_at: '2026-01-01T00:00:00.000Z'
  });

  assert.equal(intent.assetId, 'usd_stable');
  assert.deepEqual(intent.asset, {
    chain: 'eip155:1',
    asset: 'usd_stable',
    decimals: 2
  });
});

test('adopts invoice and payout boundaries with canonical asset reference', () => {
  const invoice = adoptInvoiceBoundary({
    invoice_id: 'inv_1',
    reference_id: 'ref_inv_1',
    sourceAccountId: 'acct_payer',
    destinationAccountId: 'acct_payee',
    amount: '50.00',
    created_at: '2026-01-01T00:00:00.000Z',
    asset: { chain: 'eip155:1', asset: 'usd_stable', decimals: 2 }
  });

  const payout = adoptPayoutBoundary({
    payout_id: 'po_1',
    reference_id: 'ref_po_1',
    sourceAccountId: 'acct_src',
    destinationAccountId: 'acct_dst',
    amount: '12.00',
    created_at: '2026-01-01T00:00:00.000Z',
    chainId: 'eip155:1',
    asset_id: 'usd_stable',
    asset_decimals: 2
  });

  assert.deepEqual(invoice.asset, { chain: 'eip155:1', asset: 'usd_stable', decimals: 2 });
  assert.equal(invoice.assetId, 'usd_stable');
  assert.deepEqual(payout.asset, { chain: 'eip155:1', asset: 'usd_stable', decimals: 2 });
  assert.equal(payout.assetId, 'usd_stable');
});
