export type PaymentKind = 'payout' | 'collection' | 'treasury_transfer';

export type PaymentState =
  | 'created'
  | 'authorized'
  | 'executing'
  | 'settled'
  | 'failed'
  | 'reversed';

export interface PaymentIntent {
  intentId: string;
  idempotencyKey: string;
  kind: PaymentKind;
  sourceAccountId: string;
  destinationAccountId: string;
  assetId: string;
  amount: string;
  reasonCode: string;
  metadata?: Record<string, string>;
  state: PaymentState;
  createdAt: string;
}
