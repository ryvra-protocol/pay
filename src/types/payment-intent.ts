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
  assetId: string;
  amount: string;
  reason_code: string;
  reason_codes?: string[];
  metadata?: Record<string, string>;
  state: PaymentIntentState;
  created_at: string;
}
