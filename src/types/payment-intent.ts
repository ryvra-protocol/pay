import type { UnifiedAssetBoundaryInput, UnifiedAssetReference } from './unified-asset.js';

export type PaymentKind = 'payout' | 'collection' | 'treasury_transfer';

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
  metadata?: Record<string, string>;
  state: PaymentIntentState;
  created_at: string;
}

export interface PaymentIntentBoundaryInput extends Omit<PaymentIntent, 'asset' | 'assetId'>, UnifiedAssetBoundaryInput {}

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
  created_at: string;
  metadata?: Record<string, string>;
}

export interface PayoutBoundaryInput
  extends Omit<PaymentPayout, 'asset' | 'assetId'>,
    UnifiedAssetBoundaryInput {}
