import type { PolicyClient } from '../adapters/policy-client.js';
import type { LedgerClient } from '../adapters/ledger-client.js';
import type { IdempotencyStore } from './idempotency-store.js';
import type { PaymentIntent, PaymentState } from '../types/payment-intent.js';
import { assertTransition } from './state-machine.js';
import { createHash } from 'node:crypto';

export interface PayServiceDependencies {
  policyClient: PolicyClient;
  ledgerClient: LedgerClient;
  idempotencyStore: IdempotencyStore;
}

export class PayService {
  constructor(private readonly deps: PayServiceDependencies) {}

  async transitionIntent(intent: PaymentIntent, toState: PaymentState): Promise<PaymentIntent> {
    assertTransition(intent.state, toState);
    const operation = `transition:${intent.state}:${toState}`;
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          reference_id: intent.reference_id,
          idempotency_key: intent.idempotency_key,
          intent_id: intent.intent_id,
          fromState: intent.state,
          toState
        })
      )
      .digest('hex');

    const existing = await this.deps.idempotencyStore.get<PaymentIntent>(
      operation,
      intent.reference_id,
      intent.idempotency_key
    );
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new Error('idempotency conflict for reference_id and idempotency_key');
      }
      return existing.response;
    }

    if (toState === 'authorized') {
      const decision = await this.deps.policyClient.evaluateAuthorization(intent);
      if (decision.decision === 'DENY') {
        const reason_codes = this.normalizeDenyReasonCodes(decision.reason_codes);
        const response = {
          ...intent,
          state: 'failed' as const,
          reason_code: reason_codes[0],
          reason_codes
        };
        await this.deps.idempotencyStore.put({
          operation,
          reference_id: intent.reference_id,
          idempotency_key: intent.idempotency_key,
          requestHash,
          response,
          created_at: new Date().toISOString()
        });
        return response;
      }
    }

    if (toState === 'executing') {
      const decision = await this.deps.policyClient.evaluateExecution(intent);
      if (decision.decision === 'DENY') {
        const reason_codes = this.normalizeDenyReasonCodes(decision.reason_codes);
        const response = {
          ...intent,
          state: 'failed' as const,
          reason_code: reason_codes[0],
          reason_codes
        };
        await this.deps.idempotencyStore.put({
          operation,
          reference_id: intent.reference_id,
          idempotency_key: intent.idempotency_key,
          requestHash,
          response,
          created_at: new Date().toISOString()
        });
        return response;
      }
    }

    await this.deps.ledgerClient.postForStateTransition(intent, intent.state, toState);
    const response = { ...intent, state: toState };
    await this.deps.idempotencyStore.put({
      operation,
      reference_id: intent.reference_id,
      idempotency_key: intent.idempotency_key,
      requestHash,
      response,
      created_at: new Date().toISOString()
    });
    return response;
  }

  private normalizeDenyReasonCodes(reason_codes: string[]): string[] {
    if (reason_codes.length === 0) {
      throw new Error('policy DENY decisions must include non-empty reason_codes');
    }

    return reason_codes.map((reasonCode) => {
      const canonical = reasonCode.trim().toUpperCase().replace(/[\s-]+/g, '_');
      return canonical.startsWith('POLICY_') ? canonical : `POLICY_DENY_${canonical}`;
    });
  }
}
