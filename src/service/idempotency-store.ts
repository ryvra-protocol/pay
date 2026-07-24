export interface IdempotencyRecord<TResponse = unknown> {
  operation: string;
  reference_id: string;
  idempotency_key: string;
  requestHash: string;
  response: TResponse;
  created_at: string;
}

export interface IdempotencyStore {
  get<TResponse = unknown>(
    operation: string,
    reference_id: string,
    idempotency_key: string
  ): Promise<IdempotencyRecord<TResponse> | null>;

  put<TResponse = unknown>(record: IdempotencyRecord<TResponse>): Promise<void>;
}
