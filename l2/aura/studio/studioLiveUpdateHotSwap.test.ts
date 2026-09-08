/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateHotSwap.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';

// `pickElementClass` checks `value.prototype instanceof HTMLElement`; Node has no such global. Set it
// BEFORE the module under test is imported, same reasoning studioLiveUpdate.test.ts uses for `window`.
(globalThis as { HTMLElement?: unknown }).HTMLElement = class {};

type HotSwapModule = typeof import('/_102020_/l2/aura/studio/studioLiveUpdateHotSwap.js');

let cached: HotSwapModule | undefined;
async function load(): Promise<HotSwapModule> {
  cached ??= await import('/_102020_/l2/aura/studio/studioLiveUpdateHotSwap.js');
  return cached;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}

// T1 — the race this guards against:
//   A patches (saves the REAL define) -> B patches (saves what it reads, which is A's guard, not the
//   real define) -> A finishes, restores the real define -> B finishes, restores "the real define" =
//   A's guard => the guard is now permanent. A depth counter fixes this WITHOUT needing the caller
//   (applyLiveUpdate) to serialize — this test proves that in isolation, interleaved, not nested.
test('withDefineGuard restores the original define even when two calls interleave (not nested)', async () => {
  const { withDefineGuard } = await load();
  // Behavioral proof, not reference equality: the real code does `registry.define.bind(registry)`,
  // which never returns the SAME function object twice — "is the original" has to mean "a name the
  // registry already knows is no longer swallowed", the guard's actual, observable effect.
  const calls: string[] = [];
  const original = (name: string) => { calls.push(name); };
  const registry = {
    define: original,
    get: (name: string) => (name === 'known' ? (class {} as never) : undefined),
  };

  const a = deferred<void>();
  const b = deferred<void>();

  // A starts first (installs the guard) and finishes LAST — B starts and finishes strictly inside A's
  // window, which is the interleaving pattern that broke the old save/restore-per-call version.
  const runA = withDefineGuard(registry, async () => { await a.promise; });
  const runB = withDefineGuard(registry, async () => { await b.promise; });

  registry.define('known', class {});
  assert.deepEqual(calls, [], 'the guard is up while both calls are in flight — "known" must be swallowed');

  b.resolve();
  await runB;
  registry.define('known', class {});
  assert.deepEqual(calls, [], 'B finishing first must NOT restore — A is still running, the guard stays up');

  a.resolve();
  await runA;
  registry.define('known', class {});
  assert.deepEqual(calls, ['known'], 'the guard comes off only once the last caller (A) finishes — define reaches the original again');
});

test('withDefineGuard ignores a name already known to the registry', async () => {
  const { withDefineGuard } = await load();
  const defined: Array<[string, unknown]> = [];
  const registry = {
    define: (name: string, ctor: unknown) => { defined.push([name, ctor]); },
    get: (name: string) => (name === 'already-there' ? (class {} as never) : undefined),
  };

  await withDefineGuard(registry, async () => {
    registry.define('already-there', class {});
    registry.define('brand-new', class {});
  });

  assert.deepEqual(defined.map(([name]) => name), ['brand-new']);
});

test('withDefineGuard reports every (name, ctor) it sees to onDefine, even for a name it ends up ignoring', async () => {
  const { withDefineGuard } = await load();
  const registry = {
    define: () => { /* noop */ },
    get: (name: string) => (name === 'dup' ? (class {} as never) : undefined),
  };
  const seen: string[] = [];

  await withDefineGuard(registry, async () => {
    registry.define('dup', class {});
    registry.define('fresh', class {});
  }, name => { seen.push(name); });

  assert.deepEqual(seen, ['dup', 'fresh']);
});

// T4 — a module exporting more than one element class must not pick arbitrarily: the tag the page is
// mounted under is the only thing that disambiguates which export IS the page.
test('pickElementClass picks the export declared under the page tag, not just the first HTMLElement export', async () => {
  const { pickElementClass } = await load();
  class UnrelatedWidget extends (globalThis as unknown as { HTMLElement: new () => object }).HTMLElement {}
  class TheActualPage extends (globalThis as unknown as { HTMLElement: new () => object }).HTMLElement {}
  const mod = { UnrelatedWidget, TheActualPage };
  const tagByCtor = new Map<Function, string>([
    [UnrelatedWidget, 'widgets--unrelated-widget'],
    [TheActualPage, 'todo--web--desktop--page11--task-catalogue-102047'],
  ]);

  const picked = pickElementClass(mod, 'todo--web--desktop--page11--task-catalogue-102047', tagByCtor);
  assert.equal(picked, TheActualPage);
});

test('pickElementClass falls back to the first export and warns once when nothing matches the tag', async () => {
  const { pickElementClass } = await load();
  class First extends (globalThis as unknown as { HTMLElement: new () => object }).HTMLElement {}
  class Second extends (globalThis as unknown as { HTMLElement: new () => object }).HTMLElement {}
  const mod = { First, Second };

  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    const picked = pickElementClass(mod, 'some--other--tag', new Map());
    assert.equal(picked, First);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = originalWarn;
  }
});

test('pickElementClass returns the only export with no ambiguity and no warning', async () => {
  const { pickElementClass } = await load();
  class OnlyOne extends (globalThis as unknown as { HTMLElement: new () => object }).HTMLElement {}
  const mod = { OnlyOne };

  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    const picked = pickElementClass(mod, 'irrelevant-tag', new Map());
    assert.equal(picked, OnlyOne);
    assert.equal(warnings.length, 0);
  } finally {
    console.warn = originalWarn;
  }
});
