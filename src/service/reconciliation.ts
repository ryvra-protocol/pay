import type { PaymentIntent } from '../types/payment-intent.js';

export interface SettlementSnapshot {
  reference_id: string;
  state: 'pending' | 'settled' | 'failed';
  amount: string;
  asset: {
    chain: string;
    asset: string;
    decimals: number;
  };
  observed_at: string;
}

export interface ReconciliationMetrics {
  increment(metricName: string, tags: Record<string, string>): void;
}

export interface ReconciliationObserver {
  emit(eventName: string, payload: Record<string, string | number | boolean | undefined>): void;
}

export interface ReconciliationDependencies {
  metrics?: ReconciliationMetrics;
  observer?: ReconciliationObserver;
}

export interface ReconciliationResult {
  status: 'matched' | 'mismatch' | 'pending';
  reason_code: string;
}

function normalizeAmount(amount: string): string {
  return amount.trim();
}

export function reconcileIntentSettlement(
  intent: PaymentIntent,
  settlement: SettlementSnapshot,
  deps: ReconciliationDependencies = {}
): ReconciliationResult {
  if (intent.reference_id !== settlement.reference_id) {
    deps.metrics?.increment('pay_reconciliation_mismatch_total', {
      kind: intent.kind,
      reason_code: 'RECON_REFERENCE_MISMATCH'
    });
    deps.observer?.emit('pay.reconciliation.mismatch', {
      intent_id: intent.intent_id,
      reference_id: intent.reference_id,
      reason_code: 'RECON_REFERENCE_MISMATCH'
    });
    return {
      status: 'mismatch',
      reason_code: 'RECON_REFERENCE_MISMATCH'
    };
  }
  if (settlement.state === 'pending') {
    return {
      status: 'pending',
      reason_code: 'SETTLEMENT_PENDING'
    };
  }

  const amountMatches = normalizeAmount(intent.amount) === normalizeAmount(settlement.amount);
  const assetMatches =
    intent.asset.chain === settlement.asset.chain &&
    intent.asset.asset === settlement.asset.asset &&
    intent.asset.decimals === settlement.asset.decimals;
  const stateMatches =
    (intent.state === 'settled' && settlement.state === 'settled') ||
    (intent.state === 'failed' && settlement.state === 'failed');

  if (amountMatches && assetMatches && stateMatches) {
    return {
      status: 'matched',
      reason_code: 'RECON_MATCHED'
    };
  }

  const reasonCode = !amountMatches
    ? 'RECON_AMOUNT_MISMATCH'
    : !assetMatches
      ? 'RECON_ASSET_MISMATCH'
      : 'RECON_STATE_MISMATCH';

  deps.metrics?.increment('pay_reconciliation_mismatch_total', {
    kind: intent.kind,
    reason_code: reasonCode
  });
  deps.observer?.emit('pay.reconciliation.mismatch', {
    intent_id: intent.intent_id,
    reference_id: intent.reference_id,
    reason_code: reasonCode
  });
  return {
    status: 'mismatch',
    reason_code: reasonCode
  };
}
