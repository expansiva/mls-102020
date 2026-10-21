/// <mls fileReference="_102020_/l2/aura/helpers/runWithConcurrency.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { runWithConcurrency } from '/_102020_/l2/aura/helpers/runWithConcurrency.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 1));

function tracker() {
  let active = 0;
  let peak = 0;
  const order: number[] = [];
  const fn = async (item: number) => {
    active += 1;
    peak = Math.max(peak, active);
    order.push(item);
    await tick();
    active -= 1;
    return item * 10;
  };
  return { fn, order, peak: () => peak };
}

test('limit 1 runs one item at a time, in order', async () => {
  const t = tracker();
  const results = await runWithConcurrency([1, 2, 3], 1, t.fn);
  assert.equal(t.peak(), 1);
  assert.deepEqual(t.order, [1, 2, 3]);
  assert.deepEqual(results, [{ ok: true, value: 10 }, { ok: true, value: 20 }, { ok: true, value: 30 }]);
});

test('a higher limit runs that many at once and never more', async () => {
  const t = tracker();
  await runWithConcurrency([1, 2, 3, 4, 5], 2, t.fn);
  assert.equal(t.peak(), 2);
});

test('a failing item does not stop the others and keeps its position', async () => {
  const results = await runWithConcurrency([1, 2, 3], 1, async item => {
    if (item === 2) throw new Error('boom');
    return item;
  });
  assert.deepEqual(results[0], { ok: true, value: 1 });
  assert.equal(results[1].ok, false);
  assert.deepEqual(results[2], { ok: true, value: 3 });
});

test('an empty list or an invalid limit still works', async () => {
  assert.deepEqual(await runWithConcurrency([], 1, async () => 1), []);
  const t = tracker();
  await runWithConcurrency([1, 2], 0, t.fn);
  assert.equal(t.peak(), 1);
});
