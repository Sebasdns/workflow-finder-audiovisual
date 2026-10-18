import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canReviseConflict, healthState, initialLanguage, modelText, persistLanguage, translate } from '../src/i18n.js';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('default language is English', () => {
  assert.equal(initialLanguage(storage()), 'en');
  assert.equal(translate('en', 'service.available'), 'Service available');
});

test('selector language changes English to Spanish and Spanish to English', () => {
  assert.equal(translate('es', 'action.build'), 'CREAR BLUEPRINT');
  assert.equal(translate('en', 'action.build'), 'BUILD BLUEPRINT');
});

test('language selection persists in localStorage-compatible storage', () => {
  const local = storage();
  assert.equal(persistLanguage(local, 'es'), 'es');
  assert.equal(initialLanguage(local), 'es');
  assert.equal(persistLanguage(local, 'en'), 'en');
  assert.equal(initialLanguage(local), 'en');
});

test('generated Blueprint content is not altered by language selection', () => {
  const generated = 'Amanecer sobre el puerto — 2025-08-27';
  assert.equal(modelText(generated), generated);
  assert.equal(modelText(generated), generated);
});

test('service health maps only an explicit ok response to available', () => {
  assert.equal(healthState({ status: 'ok' }), 'available');
  assert.equal(healthState({ status: 'error' }), 'unavailable');
  assert.equal(healthState(undefined), 'unavailable');
});

test('no-conflict state cannot expose an invalid revise action', () => {
  assert.equal(canReviseConflict(undefined), false);
  assert.equal(canReviseConflict({ decision_required: true }), false);
  assert.equal(canReviseConflict({ conflict_id: 'CF_01', decision_required: false }), false);
  assert.equal(canReviseConflict({ conflict_id: 'CF_01', decision_required: true }), true);
});
