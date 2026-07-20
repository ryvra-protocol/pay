import type { PaymentState } from '../types/payment-intent.js';

const allowedTransitions: Record<PaymentState, ReadonlySet<PaymentState>> = {
  created: new Set(['authorized', 'failed']),
  authorized: new Set(['executing', 'failed']),
  executing: new Set(['settled', 'failed']),
  settled: new Set(['reversed']),
  failed: new Set(),
  reversed: new Set()
};

export function canTransition(fromState: PaymentState, toState: PaymentState): boolean {
  return allowedTransitions[fromState].has(toState);
}

export function assertTransition(fromState: PaymentState, toState: PaymentState): void {
  if (!canTransition(fromState, toState)) {
    throw new Error(`invalid payment state transition: ${fromState} -> ${toState}`);
  }
}
