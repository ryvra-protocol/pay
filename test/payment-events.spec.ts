import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PaymentEvent } from '../src/types/payment-events.js';

test('payment event envelope contains canonical fields', () => {
  const event: PaymentEvent = {
    event_id: 'evt_1',
    correlation_id: 'corr_1',
    reference_id: 'ref_1',
    event_type: 'payment.intent.transitioned',
    timestamp: new Date().toISOString(),
    payload: {
      intent_id: 'pi_1',
      from_state: 'created',
      to_state: 'authorized',
      reason_code: 'PAYMENT_PAYOUT_OK',
      reason_codes: ['PAYMENT_PAYOUT_OK'],
      ledger_event_id: 'le_1'
    }
  };

  assert.equal(typeof event.event_id, 'string');
  assert.equal(typeof event.correlation_id, 'string');
  assert.equal(typeof event.reference_id, 'string');
  assert.equal(typeof event.event_type, 'string');
  assert.equal(typeof event.timestamp, 'string');
  assert.equal(typeof event.payload, 'object');
});
