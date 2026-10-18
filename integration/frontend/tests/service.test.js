import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/service.js';

test('release service exposes the real health, generate and revise operations', () => {
  const service = createService();
  assert.equal(typeof service.health, 'function');
  assert.equal(typeof service.generate, 'function');
  assert.equal(typeof service.revise, 'function');
  assert.equal('demo' in service, false);
});
