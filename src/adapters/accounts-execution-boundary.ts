import type { AccountsExecutionRequest } from '../types/accounts-execution.js';
import type { PaymentIntent } from '../types/payment-intent.js';

function requireString(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} is required`);
  }
  return normalized;
}

export function mapIntentToExecutionRequest(intent: PaymentIntent): AccountsExecutionRequest {
  const base = {
    intent_id: intent.intent_id,
    reference_id: intent.reference_id,
    sourceAccountId: intent.sourceAccountId,
    destinationAccountId: intent.destinationAccountId,
    amount: intent.amount,
    asset: intent.asset,
    user_op_hash: intent.user_op_hash
  };

  const mode = intent.execution?.mode ?? 'legacy';
  if (mode === 'legacy') {
    return { mode: 'legacy', ...base };
  }

  const smartAccountId = requireString('execution.smart_account_id', intent.execution?.smart_account_id);
  const entryPoint = requireString('execution.entry_point', intent.execution?.entry_point);
  const sponsorshipMode = intent.execution?.sponsorship_mode ?? 'none';
  const sponsorAccountId = intent.execution?.sponsor_account_id;
  const sponsorChain = intent.execution?.sponsor_chain ?? intent.asset.chain;
  const sponsorAsset = intent.execution?.sponsor_asset ?? intent.asset.asset;

  if (sponsorAccountId !== undefined && sponsorAccountId !== intent.sourceAccountId) {
    throw new Error('execution.sponsor_account_id must match sourceAccountId');
  }
  if (sponsorChain !== intent.asset.chain) {
    throw new Error('execution.sponsor_chain must match intent asset chain');
  }
  if (sponsorAsset !== intent.asset.asset) {
    throw new Error('execution.sponsor_asset must match intent asset');
  }
  if (sponsorshipMode === 'paymaster' && !sponsorAccountId) {
    throw new Error('execution.sponsor_account_id is required when sponsorship_mode is paymaster');
  }

  return {
    mode: 'erc4337',
    ...base,
    aa: {
      smart_account_id: smartAccountId,
      entry_point: entryPoint,
      sponsorship_mode: sponsorshipMode,
      sponsor_account_id: sponsorAccountId,
      sponsor_chain: sponsorChain,
      sponsor_asset: sponsorAsset
    }
  };
}
