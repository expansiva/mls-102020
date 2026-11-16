/// <mls fileReference="_102020_/l2/aura/plugins/helpers/menuNotify.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { notifyMenuChanged } from '/_102020_/l2/aura/plugins/helpers/menuNotify.js';

function captureErrors(run: () => void): string[] {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    run();
  } finally {
    console.error = original;
  }
  return errors;
}

test('calls updateMenu once when it exists', () => {
  let calls = 0;
  const errors = captureErrors(() => notifyMenuChanged(() => () => { calls += 1; }));
  assert.equal(calls, 1);
  assert.deepEqual(errors, []);
});

test('without updateMenu it logs and does not throw', () => {
  const errors = captureErrors(() => notifyMenuChanged(() => undefined));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /mls\.sites\.updateMenu is not available/u);
});

test('an updateMenu that throws is logged, not propagated', () => {
  const errors = captureErrors(() => notifyMenuChanged(() => () => { throw new Error('boom'); }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /mls\.sites\.updateMenu failed:.*boom/u);
});

test('the default lookup reads globalThis.mls.sites.updateMenu at call time', () => {
  const holder = globalThis as { mls?: unknown };
  const previous = holder.mls;
  let calls = 0;
  try {
    holder.mls = { sites: { updateMenu: () => { calls += 1; } } };
    notifyMenuChanged();
    assert.equal(calls, 1);
  } finally {
    holder.mls = previous;
  }
});
