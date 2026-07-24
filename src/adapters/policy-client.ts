import type { PaymentIntent } from '../types/payment-intent.js';

export interface PolicyDecision {
  decision: 'ALLOW' | 'DENY';
  reason_codes: string[];
  evidence_ref?: string;
}

export interface PolicyClient {
  evaluateAuthorization(intent: PaymentIntent): Promise<PolicyDecision>;
  evaluateExecution(intent: PaymentIntent): Promise<PolicyDecision>;
}
