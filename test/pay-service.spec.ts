import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PayService } from '../src/service/pay-service.js';
import type { IdempotencyRecord, IdempotencyStore } from '../src/service/idempotency-store.js';
import type { LedgerClient } from '../src/adapters/ledger-client.js';
import type { PolicyClient } from '../src/adapters/policy-client.js';
import type { PaymentIntent } from '../src/types/payment-intent.js';

class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord<unknown>>();

  private key(operation: string, reference_id: string, idempotency_key: string): string {
    return `${operation}:${reference_id}:${idempotency_key}`;
  }

  async get<TResponse = unknown>(
    operation: string,
    reference_id: string,
    idempotency_key: string
  ): Promise<IdempotencyRecord<TResponse> | null> {
    const record = this.records.get(this.key(operation, reference_id, idempotency_key));
    return (record as IdempotencyRecord<TResponse>) ?? null;
  }

  async put<TResponse = unknown>(record: IdempotencyRecord<TResponse>): Promise<void> {
    this.records.set(
      this.key(record.operation, record.reference_id, record.idempotency_key),
      record as IdempotencyRecord<unknown>
    );
  }
}

function createIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    intent_id: 'pi_1',
    reference_id: 'ref_1',
    idempotency_key: 'idem_1',
    kind: 'payout',
    sourceAccountId: 'acct_src',
    destinationAccountId: 'acct_dst',
    asset: {
      chain: 'eip155:1',
      asset: 'usd_stable',
      decimals: 2
    },
    assetId: 'usd_stable',
    amount: '100.00',
    reason_code: 'PAYMENT_PAYOUT_OK',
    state: 'created',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

test('policy DENY includes non-empty canonical reason_codes', async () => {
  const policyClient: PolicyClient = {
    async evaluateAuthorization() {
      return { decision: 'DENY', reason_codes: ['limit exceeded'] };
    },
    async evaluateExecution() {
      return { decision: 'ALLOW', reason_codes: [] };
    }
  };
  const ledgerClient: LedgerClient = {
    async postForStateTransition() {
      throw new Error('ledger posting should not execute on DENY');
    }
  };

  const service = new PayService({
    policyClient,
    ledgerClient,
    idempotencyStore: new InMemoryIdempotencyStore()
  });

  const denied = await service.transitionIntent(createIntent(), 'authorized');
  assert.equal(denied.state, 'failed');
  assert.deepEqual(denied.reason_codes, ['POLICY_DENY_LIMIT_EXCEEDED']);
  assert.equal(denied.reason_code, 'POLICY_DENY_LIMIT_EXCEEDED');
});

test('same reference_id + idempotency_key replay does not duplicate ledger side effects', async () => {
  let ledgerCalls = 0;
  const policyClient: PolicyClient = {
    async evaluateAuthorization() {
      return { decision: 'ALLOW', reason_codes: [] };
    },
    async evaluateExecution() {
      return { decision: 'ALLOW', reason_codes: [] };
    }
  };
  const ledgerClient: LedgerClient = {
    async postForStateTransition() {
      ledgerCalls += 1;
      return { ledger_event_id: 'le_1', resultingState: 'executing' };
    }
  };
  const service = new PayService({
    policyClient,
    ledgerClient,
    idempotencyStore: new InMemoryIdempotencyStore()
  });

  const intent = createIntent({ state: 'authorized' });
  const first = await service.transitionIntent(intent, 'executing');
  const replay = await service.transitionIntent(intent, 'executing');

  assert.equal(ledgerCalls, 1);
  assert.deepEqual(replay, first);
});

test('AA-enabled execution succeeds and emits settlement latency metric', async () => {
  const observedMetrics: string[] = [];
  const policyClient: PolicyClient = {
    async evaluateAuthorization() {
      return { decision: 'ALLOW', reason_codes: [] };
    },
    async evaluateExecution() {
      return { decision: 'ALLOW', reason_codes: [] };
    }
  };
  const ledgerClient: LedgerClient = {
    async postForStateTransition() {
      return { ledger_event_id: 'le_settle_1', resultingState: 'settled' };
    }
  };

  const service = new PayService({
    policyClient,
    ledgerClient,
    idempotencyStore: new InMemoryIdempotencyStore(),
    metrics: {
      increment(metricName) {
        observedMetrics.push(metricName);
      },
      observe(metricName) {
        observedMetrics.push(metricName);
      }
    }
  });

  const settled = await service.transitionIntent(
    createIntent({
      state: 'executing',
      execution: {
        mode: 'erc4337',
        smart_account_id: 'sa_1',
        entry_point: '0xaabbccdd',
        sponsorship_mode: 'none'
      }
    }),
    'settled'
  );
  assert.equal(settled.state, 'settled');
  assert.equal(observedMetrics.includes('pay_intent_total'), true);
  assert.equal(observedMetrics.includes('pay_time_to_settlement_ms'), true);
});

test('AA execution falls back to legacy with explicit reason code', async () => {
  let calls = 0;
  const policyClient: PolicyClient = {
    async evaluateAuthorization() {
      return { decision: 'ALLOW', reason_codes: [] };
    },
    async evaluateExecution() {
      return { decision: 'ALLOW', reason_codes: [] };
    }
  };
  const ledgerClient: LedgerClient = {
    async postForStateTransition(intent) {
      calls += 1;
      if (calls === 1 && intent.execution?.mode === 'erc4337') {
        throw new Error('AA unsupported by route');
      }
      return { ledger_event_id: 'le_exec_legacy', resultingState: 'executing' };
    }
  };

  const service = new PayService({
    policyClient,
    ledgerClient,
    idempotencyStore: new InMemoryIdempotencyStore()
  });
  const result = await service.transitionIntent(
    createIntent({
      state: 'authorized',
      execution: {
        mode: 'erc4337',
        smart_account_id: 'sa_1',
        entry_point: '0xaabbccdd',
        sponsorship_mode: 'none',
        allow_legacy_fallback: true
      }
    }),
    'executing'
  );

  assert.equal(result.state, 'executing');
  assert.equal(result.execution?.mode, 'legacy');
  assert.equal(result.reason_code, 'EXECUTION_AA_FALLBACK_LEGACY');
  assert.equal(calls, 2);
});

test('settlement timeout maps to failed state and triggers retry/escalation hooks', async () => {
  const retried: string[] = [];
  const escalated: string[] = [];
  const failureMetrics: string[] = [];
  const policyClient: PolicyClient = {
    async evaluateAuthorization() {
      return { decision: 'ALLOW', reason_codes: [] };
    },
    async evaluateExecution() {
      return { decision: 'ALLOW', reason_codes: [] };
    }
  };
  const ledgerClient: LedgerClient = {
    async postForStateTransition() {
      throw new Error('settlement timeout');
    }
  };

  const service = new PayService({
    policyClient,
    ledgerClient,
    idempotencyStore: new InMemoryIdempotencyStore(),
    metrics: {
      increment(metricName) {
        failureMetrics.push(metricName);
      },
      observe() {}
    },
    retryHook: {
      async scheduleRetry(context) {
        retried.push(context.reason_code);
      }
    },
    escalationHook: {
      async escalate(context) {
        escalated.push(context.severity);
      }
    }
  });

  const result = await service.transitionIntent(createIntent({ state: 'executing' }), 'settled');
  assert.equal(result.state, 'failed');
  assert.equal(result.reason_code, 'SETTLEMENT_LATENCY_TIMEOUT');
  assert.equal(retried[0], 'SETTLEMENT_LATENCY_TIMEOUT');
  assert.equal(escalated[0], 'high');
  assert.equal(failureMetrics.includes('pay_intent_failure_total'), true);
});
