import type { PolicyClient } from '../adapters/policy-client.js';
import type { LedgerClient } from '../adapters/ledger-client.js';
import type { IdempotencyStore } from './idempotency-store.js';
import type { PaymentIntent, PaymentState } from '../types/payment-intent.js';
import { assertTransition } from './state-machine.js';

export interface PayServiceDependencies {
  policyClient: PolicyClient;
  ledgerClient: LedgerClient;
  idempotencyStore: IdempotencyStore;
}

export class PayService {
  constructor(private readonly deps: PayServiceDependencies) {}

  async transitionIntent(intent: PaymentIntent, toState: PaymentState): Promise<PaymentIntent> {
    assertTransition(intent.state, toState);

    if (toState === 'authorized') {
      const decision = await this.deps.policyClient.evaluateAuthorization(intent);
      if (!decision.allowed) {
        return { ...intent, state: 'failed', reasonCode: decision.reasonCode };
      }
    }

    if (toState === 'executing') {
      const decision = await this.deps.policyClient.evaluateExecution(intent);
      if (!decision.allowed) {
        return { ...intent, state: 'failed', reasonCode: decision.reasonCode };
      }
    }

    await this.deps.ledgerClient.postForStateTransition(intent, intent.state, toState);
    return { ...intent, state: toState };
  }
}
