import type { PolicyClient } from '../adapters/policy-client.js';
import type { LedgerClient } from '../adapters/ledger-client.js';
import type { IdempotencyStore } from './idempotency-store.js';
import type { PaymentIntent, PaymentState } from '../types/payment-intent.js';
import { assertTransition } from './state-machine.js';
import { createHash } from 'node:crypto';

export interface PayMetricTags {
  kind: PaymentIntent['kind'];
  from_state: PaymentState;
  to_state: PaymentState;
  execution_mode: PaymentIntent['execution'] extends undefined ? 'legacy' : 'legacy' | 'erc4337';
  reason_code?: string;
}

export interface PayMetrics {
  increment(metricName: string, tags: Record<string, string>): void;
  observe(metricName: string, value: number, tags: Record<string, string>): void;
}

export interface PayLifecycleObserver {
  emit(eventName: string, payload: Record<string, string | number | boolean | undefined>): void;
}

export interface SettlementRetryContext {
  intent_id: string;
  reference_id: string;
  from_state: PaymentState;
  to_state: PaymentState;
  reason_code: string;
}

export interface SettlementEscalationContext extends SettlementRetryContext {
  severity: 'high' | 'critical';
}

export interface SettlementRetryHook {
  scheduleRetry(context: SettlementRetryContext): Promise<void>;
}

export interface SettlementEscalationHook {
  escalate(context: SettlementEscalationContext): Promise<void>;
}

export interface PayServiceDependencies {
  policyClient: PolicyClient;
  ledgerClient: LedgerClient;
  idempotencyStore: IdempotencyStore;
  metrics?: PayMetrics;
  lifecycleObserver?: PayLifecycleObserver;
  retryHook?: SettlementRetryHook;
  escalationHook?: SettlementEscalationHook;
}

export class PayService {
  constructor(private readonly deps: PayServiceDependencies) {}

  async transitionIntent(intent: PaymentIntent, toState: PaymentState): Promise<PaymentIntent> {
    assertTransition(intent.state, toState);
    const operation = `transition:${intent.kind}:${intent.state}:${toState}`;
    const startedAt = Date.now();
    const metricTags = this.metricTags(intent, intent.state, toState);
    this.deps.metrics?.increment('pay_intent_total', metricTags);
    this.deps.lifecycleObserver?.emit('pay.lifecycle.transition_requested', {
      intent_id: intent.intent_id,
      reference_id: intent.reference_id,
      kind: intent.kind,
      from_state: intent.state,
      to_state: toState,
      execution_mode: intent.execution?.mode ?? 'legacy',
      asset_chain: intent.asset.chain,
      asset: intent.asset.asset
    });
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          reference_id: intent.reference_id,
          idempotency_key: intent.idempotency_key,
          intent_id: intent.intent_id,
          kind: intent.kind,
          amount: intent.amount,
          asset: intent.asset,
          execution: intent.execution,
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

    const response = await this.applyLedgerTransition(intent, toState);
    await this.deps.idempotencyStore.put({
      operation,
      reference_id: intent.reference_id,
      idempotency_key: intent.idempotency_key,
      requestHash,
      response,
      created_at: new Date().toISOString()
    });
    if (response.state === 'failed') {
      const failureTags = this.metricTags(intent, intent.state, toState, response.reason_code);
      this.deps.metrics?.increment('pay_intent_failure_total', failureTags);
      this.deps.lifecycleObserver?.emit('pay.lifecycle.transition_failed', {
        intent_id: intent.intent_id,
        reference_id: intent.reference_id,
        kind: intent.kind,
        from_state: intent.state,
        to_state: toState,
        reason_code: response.reason_code,
        execution_mode: intent.execution?.mode ?? 'legacy'
      });
      await this.invokeSettlementHooksIfNeeded(intent, toState, response.reason_code);
      return response;
    }

    this.deps.lifecycleObserver?.emit('pay.lifecycle.transition_succeeded', {
      intent_id: intent.intent_id,
      reference_id: intent.reference_id,
      kind: intent.kind,
      from_state: intent.state,
      to_state: response.state,
      execution_mode: response.execution?.mode ?? 'legacy'
    });
    if (response.state === 'settled') {
      this.deps.metrics?.observe(
        'pay_time_to_settlement_ms',
        this.computeSettlementLatencyMs(response, startedAt),
        metricTags
      );
    }
    return response;
  }

  private async applyLedgerTransition(intent: PaymentIntent, toState: PaymentState): Promise<PaymentIntent> {
    try {
      await this.deps.ledgerClient.postForStateTransition(intent, intent.state, toState);
      return { ...intent, state: toState };
    } catch (error) {
      const reasonCode = this.mapExecutionErrorToReasonCode(error);
      const allowFallback =
        toState === 'executing' &&
        intent.execution?.mode === 'erc4337' &&
        intent.execution.allow_legacy_fallback === true &&
        reasonCode === 'EXECUTION_AA_UNSUPPORTED';
      if (allowFallback) {
        const legacyIntent: PaymentIntent = {
          ...intent,
          execution: { mode: 'legacy' },
          reason_code: 'EXECUTION_AA_FALLBACK_LEGACY',
          reason_codes: ['EXECUTION_AA_FALLBACK_LEGACY']
        };
        await this.deps.ledgerClient.postForStateTransition(legacyIntent, intent.state, toState);
        this.deps.lifecycleObserver?.emit('pay.lifecycle.aa_fallback_legacy', {
          intent_id: intent.intent_id,
          reference_id: intent.reference_id,
          fallback_reason_code: 'EXECUTION_AA_FALLBACK_LEGACY',
          original_reason_code: reasonCode
        });
        return { ...legacyIntent, state: toState };
      }
      return {
        ...intent,
        state: 'failed',
        reason_code: reasonCode,
        reason_codes: [reasonCode]
      };
    }
  }

  private mapExecutionErrorToReasonCode(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes('aa') && message.includes('unsupported')) {
      return 'EXECUTION_AA_UNSUPPORTED';
    }
    if (message.includes('entrypoint') || message.includes('userop') || message.includes('paymaster')) {
      return 'EXECUTION_AA_REQUEST_INVALID';
    }
    if (message.includes('timeout') || message.includes('pending') || message.includes('latency')) {
      return 'SETTLEMENT_LATENCY_TIMEOUT';
    }
    return 'EXECUTION_FAILED';
  }

  private async invokeSettlementHooksIfNeeded(
    intent: PaymentIntent,
    toState: PaymentState,
    reasonCode: string
  ): Promise<void> {
    if (reasonCode !== 'SETTLEMENT_LATENCY_TIMEOUT' || toState !== 'settled') {
      return;
    }
    const context: SettlementRetryContext = {
      intent_id: intent.intent_id,
      reference_id: intent.reference_id,
      from_state: intent.state,
      to_state: toState,
      reason_code: reasonCode
    };
    await this.deps.retryHook?.scheduleRetry(context);
    await this.deps.escalationHook?.escalate({
      ...context,
      severity: 'high'
    });
  }

  private computeSettlementLatencyMs(intent: PaymentIntent, startedAt: number): number {
    const createdAt = Date.parse(intent.created_at);
    if (!Number.isNaN(createdAt)) {
      const latency = Date.now() - createdAt;
      if (latency >= 0) {
        return latency;
      }
    }
    return Date.now() - startedAt;
  }

  private metricTags(
    intent: PaymentIntent,
    fromState: PaymentState,
    toState: PaymentState,
    reasonCode?: string
  ): Record<string, string> {
    return {
      kind: intent.kind,
      from_state: fromState,
      to_state: toState,
      execution_mode: intent.execution?.mode ?? 'legacy',
      reason_code: reasonCode ?? 'none'
    };
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
