import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/service/state-machine.js';

test('allows expected canonical transitions', () => {
  assert.equal(canTransition('created', 'authorized'), true);
  assert.equal(canTransition('authorized', 'executing'), true);
  assert.equal(canTransition('executing', 'settled'), true);
  assert.equal(canTransition('settled', 'reversed'), true);
});

test('rejects invalid transition', () => {
  assert.equal(canTransition('created', 'settled'), false);
});
