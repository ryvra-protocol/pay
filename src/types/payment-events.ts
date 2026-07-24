import type { PaymentIntentState } from './payment-intent.js';

export interface CanonicalEventEnvelope<TPayload = unknown> {
  event_id: string;
  correlation_id: string;
  reference_id: string;
  event_type: string;
  timestamp: string;
  payload: TPayload;
}

export interface PaymentTransitionPayload {
  intent_id: string;
  from_state: PaymentIntentState;
  to_state: PaymentIntentState;
  reason_code: string;
  reason_codes: string[];
  ledger_event_id?: string;
}

export interface PaymentEvent extends CanonicalEventEnvelope<PaymentTransitionPayload> {}

export interface PaymentFailurePayload extends PaymentTransitionPayload {
  failure_category: 'policy' | 'execution' | 'settlement' | 'reversal';
}

export interface PaymentFailureEvent extends CanonicalEventEnvelope<PaymentFailurePayload> {}
