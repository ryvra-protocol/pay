export interface IdempotencyRecord<TResponse = unknown> {
  operation: string;
  callerId: string;
  idempotencyKey: string;
  requestHash: string;
  response: TResponse;
  createdAt: string;
}

export interface IdempotencyStore {
  get<TResponse = unknown>(
    operation: string,
    callerId: string,
    idempotencyKey: string
  ): Promise<IdempotencyRecord<TResponse> | null>;

  put<TResponse = unknown>(record: IdempotencyRecord<TResponse>): Promise<void>;
}
