import type { UnifiedAssetBoundaryInput, UnifiedAssetReference } from './unified-asset.js';

export type PaymentKind = 'payout' | 'collection' | 'treasury_transfer';
export type PaymentExecutionMode = 'legacy' | 'erc4337';
export type SponsorshipMode = 'none' | 'paymaster';

export interface PaymentExecution {
  mode: PaymentExecutionMode;
  smart_account_id?: string;
  entry_point?: string;
  sponsorship_mode?: SponsorshipMode;
  sponsor_account_id?: string;
  sponsor_chain?: string;
  sponsor_asset?: string;
  allow_legacy_fallback?: boolean;
}

export type PaymentIntentState =
  | 'created'
  | 'authorized'
  | 'executing'
  | 'settled'
  | 'failed'
  | 'reversed';

export type PaymentState = PaymentIntentState;

export interface PaymentIntent {
  intent_id: string;
  reference_id: string;
  idempotency_key: string;
  kind: PaymentKind;
  sourceAccountId: string;
  destinationAccountId: string;
  asset: UnifiedAssetReference;
  assetId: string;
  amount: string;
  reason_code: string;
  reason_codes?: string[];
  user_op_hash?: string;
  execution?: PaymentExecution;
  metadata?: Record<string, string>;
  state: PaymentIntentState;
  created_at: string;
}

export interface AccountAbstractionBoundaryInput {
  execution?: Partial<PaymentExecution>;
  execution_mode?: PaymentExecutionMode;
  executionMode?: PaymentExecutionMode;
  allow_legacy_fallback?: boolean;
  allowLegacyFallback?: boolean;
  smart_account_id?: string;
  smartAccountId?: string;
  entry_point?: string;
  entryPoint?: string;
  sponsorship_mode?: SponsorshipMode;
  sponsorshipMode?: SponsorshipMode;
  sponsor_account_id?: string;
  sponsorAccountId?: string;
  sponsor_chain?: string;
  sponsorChain?: string;
  sponsor_asset?: string;
  sponsorAsset?: string;
  user_op_hash?: string;
  userOpHash?: string;
}

export interface PaymentIntentBoundaryInput
  extends Omit<PaymentIntent, 'asset' | 'assetId' | 'execution' | 'user_op_hash'>,
    UnifiedAssetBoundaryInput,
    AccountAbstractionBoundaryInput {}

export interface PaymentInvoice {
  invoice_id: string;
  reference_id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  asset: UnifiedAssetReference;
  assetId: string;
  created_at: string;
  metadata?: Record<string, string>;
}

export interface InvoiceBoundaryInput
  extends Omit<PaymentInvoice, 'asset' | 'assetId'>,
    UnifiedAssetBoundaryInput {}

export interface PaymentPayout {
  payout_id: string;
  reference_id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  asset: UnifiedAssetReference;
  assetId: string;
  user_op_hash?: string;
  execution?: PaymentExecution;
  created_at: string;
  metadata?: Record<string, string>;
}

export interface PayoutBoundaryInput
  extends Omit<PaymentPayout, 'asset' | 'assetId' | 'execution' | 'user_op_hash'>,
    UnifiedAssetBoundaryInput,
    AccountAbstractionBoundaryInput {}
