import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PaymentIntent } from '../src/types/payment-intent.js';

test('payment intent type-compatible baseline object can be created', () => {
  const intent: PaymentIntent = {
    intentId: 'pi_1',
    idempotencyKey: 'idem_1',
    kind: 'payout',
    sourceAccountId: 'acct_src',
    destinationAccountId: 'acct_dst',
    assetId: 'usd_stable',
    amount: '100.00',
    reasonCode: 'PAYOUT_OK',
    state: 'created',
    createdAt: new Date().toISOString()
  };

  assert.equal(intent.kind, 'payout');
  assert.equal(intent.state, 'created');
});
