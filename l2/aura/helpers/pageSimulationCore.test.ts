/// <mls fileReference="_102020_/l2/aura/helpers/pageSimulationCore.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PageSimulation, REASSERT_MS, SIMULATED_KEYS_STATE, pageIdOf, type ISimulationStore,
} from '/_102020_/l2/aura/helpers/pageSimulationCore.js';

/** collabState on a Map: watchers are called on every set, like the app's subscribers. */
function fakeStore(initial: Record<string, unknown> = {}) {
  const values = new Map<string, unknown>(Object.entries(initial));
  const watchers = new Set<{ keys: string[]; onChange: (key: string, value: unknown) => void }>();
  const pending: Array<() => void> = [];
  let clock = 1000;
  const store: ISimulationStore = {
    get: key => values.get(key),
    set: (key, value) => {
      values.set(key, value);
      for (const watcher of [...watchers]) if (watcher.keys.includes(key)) watcher.onChange(key, value);
    },
    watch: (keys, onChange) => {
      const watcher = { keys, onChange };
      watchers.add(watcher);
      return () => { watchers.delete(watcher); };
    },
    now: () => clock,
    later: run => { pending.push(run); },
  };
  return {
    store, values,
    tick: (ms: number) => { clock += ms; },
    flush: () => { while (pending.length) pending.shift()?.(); },
  };
}

const PAGE = pageIdOf({ project: 102047, folder: 'tarefas/web/desktop/page11', shortName: 'equipe' });
const OTHER = pageIdOf({ project: 102047, folder: 'tarefas/web/desktop/page11', shortName: 'pessoas' });
const K = (member: string) => `ui.tarefas.equipe.${member}`;

test('a situation writes its members and restoring puts back what the APP had', () => {
  const { store, values } = fakeStore({ [K('pageStatus')]: 'ok', [K('qryStatus')]: 'success' });
  const sim = new PageSimulation(store);
  sim.setSituation(PAGE, 'loading', [], { [K('pageStatus')]: 'loading', [K('qryStatus')]: 'loading' });
  assert.equal(values.get(K('pageStatus')), 'loading');
  assert.equal(sim.activeFor(PAGE), 'loading');
  assert.deepEqual(values.get(SIMULATED_KEYS_STATE), [K('pageStatus'), K('qryStatus')]);

  // Another situation over the same key: the original is still the app's, not the first simulation.
  sim.setSituation(PAGE, 'empty', [K('pageStatus'), K('qryStatus')], { [K('pageStatus')]: 'empty' });
  sim.write(PAGE, K('pageStatus'), 'error');
  sim.restoreAll();
  assert.equal(values.get(K('pageStatus')), 'ok');
  assert.equal(values.get(K('qryStatus')), 'success');
  assert.equal(sim.activeFor(PAGE), null);
  assert.deepEqual(values.get(SIMULATED_KEYS_STATE), []);
});

test('the simulation outlives whoever drew it, and ends when another page is shown', () => {
  const { store, values } = fakeStore({ [K('scenary')]: 'base' });
  const sim = new PageSimulation(store);
  let redraws = 0;
  const stop = sim.onChange(() => { redraws += 1; });
  sim.pageShown(PAGE);
  sim.write(PAGE, K('scenary'), 'detail');
  assert.ok(redraws > 0);
  // The tab goes away (another knob): nothing is restored.
  stop();
  sim.pageShown(PAGE);
  assert.equal(values.get(K('scenary')), 'detail');
  assert.equal(sim.simulatedFor(PAGE).size, 1);
  // Another page on screen: the simulation belonged to the first one.
  sim.pageShown(OTHER);
  assert.equal(values.get(K('scenary')), 'base');
  assert.equal(sim.simulatedFor(PAGE).size, 0);
});

test('a write for another page undoes the simulation of the previous one', () => {
  const { store, values } = fakeStore({ [K('scenary')]: 'base' });
  const sim = new PageSimulation(store);
  sim.write(PAGE, K('scenary'), 'detail');
  sim.write(OTHER, 'ui.tarefas.pessoas.scenary', 'detail');
  assert.equal(values.get(K('scenary')), 'base');
  assert.equal(sim.simulatedFor(OTHER).size, 1);
  assert.equal(sim.simulatedFor(PAGE).size, 0);
});

test('after a live update the app overwriting a simulated value is put back, for a while only', () => {
  const { store, values, tick, flush } = fakeStore({ [K('pageStatus')]: 'ok' });
  const sim = new PageSimulation(store);
  sim.setSituation(PAGE, 'loading', [], { [K('pageStatus')]: 'loading' });

  // The remounted page resets its state: the simulation comes back.
  sim.reapply();
  store.set(K('pageStatus'), 'ok');
  flush();
  assert.equal(values.get(K('pageStatus')), 'loading');

  // Past the window, an overwrite is the app's: only reported.
  tick(REASSERT_MS + 1);
  store.set(K('pageStatus'), 'ok');
  flush();
  assert.equal(values.get(K('pageStatus')), 'ok');
  // And restoring still puts back the original.
  sim.restoreAll();
  assert.equal(values.get(K('pageStatus')), 'ok');
});
