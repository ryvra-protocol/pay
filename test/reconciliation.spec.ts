import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileIntentSettlement } from '../src/service/reconciliation.js';
import type { PaymentIntent } from '../src/types/payment-intent.js';

function createIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    intent_id: 'pi_recon_1',
    reference_id: 'ref_recon_1',
    idempotency_key: 'idem_recon_1',
    kind: 'payout',
    sourceAccountId: 'acct_src',
    destinationAccountId: 'acct_dst',
    asset: {
      chain: 'eip155:1',
      asset: 'usd_stable',
      decimals: 2
    },
    assetId: 'usd_stable',
    amount: '100.00',
    reason_code: 'PAYMENT_PAYOUT_OK',
    state: 'settled',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

test('reconciliation returns matched on aligned settlement snapshot', () => {
  const result = reconcileIntentSettlement(createIntent(), {
    reference_id: 'ref_recon_1',
    state: 'settled',
    amount: '100.00',
    asset: {
      chain: 'eip155:1',
      asset: 'usd_stable',
      decimals: 2
    },
    observed_at: new Date().toISOString()
  });

  assert.deepEqual(result, { status: 'matched', reason_code: 'RECON_MATCHED' });
});

test('reconciliation mismatch increments mismatch metric with reason code', () => {
  const metrics: string[] = [];
  const result = reconcileIntentSettlement(
    createIntent(),
    {
      reference_id: 'ref_recon_1',
      state: 'settled',
      amount: '101.00',
      asset: {
        chain: 'eip155:1',
        asset: 'usd_stable',
        decimals: 2
      },
      observed_at: new Date().toISOString()
    },
    {
      metrics: {
        increment(metricName, tags) {
          metrics.push(`${metricName}:${tags.reason_code}`);
        }
      }
    }
  );

  assert.equal(result.status, 'mismatch');
  assert.equal(result.reason_code, 'RECON_AMOUNT_MISMATCH');
  assert.equal(metrics.includes('pay_reconciliation_mismatch_total:RECON_AMOUNT_MISMATCH'), true);
});
