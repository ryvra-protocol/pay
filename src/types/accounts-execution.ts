import type { PaymentExecution, PaymentIntent } from './payment-intent.js';
import type { UnifiedAssetReference } from './unified-asset.js';

interface AccountsExecutionRequestBase {
  intent_id: string;
  reference_id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  asset: UnifiedAssetReference;
  user_op_hash?: string;
}

export interface LegacyExecutionRequest extends AccountsExecutionRequestBase {
  mode: 'legacy';
}

export interface Erc4337ExecutionRequest extends AccountsExecutionRequestBase {
  mode: 'erc4337';
  aa: {
    smart_account_id: string;
    entry_point: string;
    sponsorship_mode: NonNullable<PaymentExecution['sponsorship_mode']>;
    sponsor_account_id?: string;
    sponsor_chain: string;
    sponsor_asset: string;
  };
}

export type AccountsExecutionRequest = LegacyExecutionRequest | Erc4337ExecutionRequest;

export interface AccountsExecutionAdapter {
  mapIntentToExecutionRequest(intent: PaymentIntent): AccountsExecutionRequest;
}
