import type { PaymentState } from './payment-intent.js';

export interface PaymentEvent {
  eventId: string;
  intentId: string;
  fromState: PaymentState;
  toState: PaymentState;
  reasonCode: string;
  occurredAt: string;
  correlationId?: string;
}

export interface PaymentFailureEvent extends PaymentEvent {
  failureCategory: 'policy' | 'execution' | 'settlement' | 'reversal';
}
