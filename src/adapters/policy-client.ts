import type { PaymentIntent } from '../types/payment-intent.js';

export interface PolicyDecision {
  allowed: boolean;
  reasonCode: string;
  evidenceRef?: string;
}

export interface PolicyClient {
  evaluateAuthorization(intent: PaymentIntent): Promise<PolicyDecision>;
  evaluateExecution(intent: PaymentIntent): Promise<PolicyDecision>;
}
