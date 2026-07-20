import type { PaymentIntent, PaymentState } from '../types/payment-intent.js';

export interface LedgerPostingResult {
  postingId: string;
  resultingState: Extract<PaymentState, 'executing' | 'settled' | 'failed' | 'reversed'>;
}

export interface LedgerClient {
  postForStateTransition(
    intent: PaymentIntent,
    fromState: PaymentState,
    toState: PaymentState
  ): Promise<LedgerPostingResult>;
}
