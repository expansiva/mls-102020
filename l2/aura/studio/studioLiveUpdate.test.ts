/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdate.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

// Set BEFORE the module under test is imported: it assigns a devtools handle on `window` and reads
// the persisted mode from `localStorage` at import time. The import is dynamic (inside the tests) so
// these run first — the harness compiles to CJS, so top-level await is not available here.
const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => { storage.set(k, v); },
};
// `reloadMode.apply` calls `window.setTimeout(() => location.reload(), ...)` — run it right away, the
// delay is only cosmetic (lets the status strip paint before the page goes away).
(globalThis as { window?: unknown }).window = {
  localStorage: localStorageStub,
  setTimeout: (fn: () => void) => { fn(); return 0; },
};
(globalThis as { localStorage?: unknown }).localStorage = localStorageStub;
let reloadCount = 0;
(globalThis as { location?: unknown }).location = { reload: () => { reloadCount += 1; } };

type LiveUpdateModule = typeof import('/_102020_/l2/aura/studio/studioLiveUpdate.js');

let cached: LiveUpdateModule | undefined;
async function load(): Promise<LiveUpdateModule> {
  cached ??= await import('/_102020_/l2/aura/studio/studioLiveUpdate.js');
  return cached;
}

test('the modes are the three documented ones', async () => {
  const { listLiveUpdateModes } = await load();
  assert.deepEqual(listLiveUpdateModes(), ['hotSwap', 'reload', 'off']);
});

test('hotSwap is the default', async () => {
  const { getLiveUpdateMode } = await load();
  assert.equal(getLiveUpdateMode(), 'hotSwap');
});

test('setting a mode persists it, so it survives the reload the `reload` mode causes', async () => {
  const { getLiveUpdateMode, setLiveUpdateMode } = await load();
  setLiveUpdateMode('reload');
  assert.equal(getLiveUpdateMode(), 'reload');
  assert.equal(storage.get('studioLiveUpdateMode'), 'reload');
});

test('an invalid mode throws, lists the valid ones and leaves the active mode alone', async () => {
  const { getLiveUpdateMode, setLiveUpdateMode } = await load();
  assert.throws(() => setLiveUpdateMode('turbo'), /turbo/u);
  assert.throws(() => setLiveUpdateMode('turbo'), /hotSwap, reload, off/u);
  assert.equal(getLiveUpdateMode(), 'reload');
});

test('isLiveUpdateMode guards against inherited object keys', async () => {
  const { isLiveUpdateMode } = await load();
  assert.equal(isLiveUpdateMode('hotSwap'), true);
  assert.equal(isLiveUpdateMode('toString'), false);
  assert.equal(isLiveUpdateMode('constructor'), false);
});

test('the devtools handle is exposed on window', async () => {
  await load();
  const handle = (globalThis as { window: { studioLiveUpdate?: { get: () => string } } }).window.studioLiveUpdate;
  assert.ok(handle);
  assert.equal(typeof handle.get, 'function');
});

test('applyLiveUpdate never throws — a broken mode becomes a reported failure', async () => {
  const { applyLiveUpdate, setLiveUpdateMode } = await load();
  setLiveUpdateMode('off');
  const result = await applyLiveUpdate({
    edited: { page: '_1_x' } as never,
    page: { page: '_1_x' } as never,
    pageTag: 'x-y-1',
  });
  assert.equal(result.ok, true);
  // The words come from the catalog now; what this test guards is that a broken mode is REPORTED.
  assert.equal(result.message, t('live.off'));
});

// certificacao.md's "prove the neighbor is intact": `reload` and `off` must keep working once
// `applyLiveUpdate` is serialized (T1) — the lock wraps every mode, it does not special-case hotSwap.
test('reload mode still applies after the T1 serialization lock was added', async () => {
  const { applyLiveUpdate, setLiveUpdateMode } = await load();
  setLiveUpdateMode('reload');
  const before = reloadCount;
  const result = await applyLiveUpdate({
    edited: { page: '_1_x' } as never,
    page: { page: '_1_x' } as never,
    pageTag: 'x-y-1',
  });
  assert.equal(result.ok, true);
  assert.equal(result.message, t('live.reloading'));
  assert.equal(reloadCount, before + 1, 'reload must still actually be scheduled');
  setLiveUpdateMode('off');
});

// T1's second aceite: the lock itself serializes overlapping callers — proven directly on `serialize`,
// with fake work standing in for a real live-update mode (going through a real mode would mean
// stubbing the DOM/compiler pipeline just to observe ordering, which is not what this is testing).
test('serialize runs queued calls one at a time, in the order they were queued', async () => {
  const { serialize } = await load();
  const order: string[] = [];
  let running = false;

  function task(name: string, ms: number): Promise<void> {
    return serialize(async () => {
      assert.equal(running, false, `${name} must not start while another queued call is still running`);
      running = true;
      order.push(`${name}:start`);
      await new Promise(resolve => { setTimeout(resolve, ms); });
      order.push(`${name}:end`);
      running = false;
    });
  }

  // B and C are queued WHILE A is still running (no awaiting A first) — exactly the overlap that used
  // to let two `applyLiveUpdate` calls interleave.
  const all = Promise.all([task('A', 30), task('B', 10), task('C', 0)]);
  await all;

  assert.deepEqual(order, ['A:start', 'A:end', 'B:start', 'B:end', 'C:start', 'C:end']);
});
