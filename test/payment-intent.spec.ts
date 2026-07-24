import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PaymentIntent } from '../src/types/payment-intent.js';

test('payment intent type-compatible baseline object can be created', () => {
  const intent: PaymentIntent = {
    intent_id: 'pi_1',
    reference_id: 'ref_1',
    idempotency_key: 'idem_1',
    kind: 'payout',
    sourceAccountId: 'acct_src',
    destinationAccountId: 'acct_dst',
    assetId: 'usd_stable',
    amount: '100.00',
    reason_code: 'PAYMENT_PAYOUT_OK',
    state: 'created',
    created_at: new Date().toISOString()
  };

  assert.equal(intent.kind, 'payout');
  assert.equal(intent.state, 'created');
});
