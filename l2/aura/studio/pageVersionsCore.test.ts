/// <mls fileReference="_102020_/l2/aura/studio/pageVersionsCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupTimeline, newerThan, pageVersionKey, pushVersion, regenAfter, sameContent, trimProject, versionBytes,
  type IPageVersion, type IPageVersionsRecord,
} from '/_102020_/l2/aura/studio/pageVersionsCore.js';
import { memoryBackend, PageVersionsStore, type IPageVersionsBackend } from '/_102020_/l2/aura/studio/pageVersionsStore.js';

const limits = { perPage: 4, mergeWindowMs: 5000 };

function v(id: number, who: IPageVersion['who'], ts: string, extra: Partial<IPageVersion> = {}): IPageVersion {
  return { id, at: id, who, what: '', ts, defs: null, ...extra };
}

test('a version equal to the last one is not added', () => {
  const list = pushVersion([v(1, 'open', 'a')], v(2, 'me', 'a'), limits);
  assert.equal(list.length, 1);
  assert.ok(sameContent({ ts: 'a', defs: null }, { ts: 'a', defs: null }));
  assert.ok(!sameContent({ ts: 'a', defs: 'x' }, { ts: 'a', defs: null }));
});

test('a different defs alone is a new version', () => {
  const list = pushVersion([v(1, 'open', 'a')], v(2, 'me', 'a', { defs: 'd' }), limits);
  assert.equal(list.length, 2);
});

test('Studio edits with the same what inside the window are one version', () => {
  let list = [v(1, 'open', 'a')];
  list = pushVersion(list, v(10, 'me', 'b', { what: 'text' }), limits);
  list = pushVersion(list, v(20, 'me', 'c', { what: 'text' }), limits);
  assert.equal(list.length, 2);
  assert.equal(list[1].ts, 'c');
  assert.equal(list[1].id, 10, 'keeps its place in the list');
  // Another kind of edit, or outside the window, is a new version.
  list = pushVersion(list, v(30, 'me', 'd', { what: 'class' }), limits);
  list = pushVersion(list, v(30 + 6000, 'me', 'e', { what: 'class' }), limits);
  assert.equal(list.length, 4);
});

test('an edit never folds into the open version, and the AI never merges', () => {
  let list = pushVersion([], v(1, 'me', 'a', { what: 'x' }), limits);
  list = pushVersion(list, v(2, 'me', 'b', { what: 'x' }), limits);
  assert.equal(list.length, 2);
  list = pushVersion([v(1, 'open', 'a'), v(2, 'ai', 'b', { what: 'r' })], v(3, 'ai', 'c', { what: 'r' }), limits);
  assert.equal(list.length, 3);
});

test('the ring drops the oldest but never the open version', () => {
  let list = [v(1, 'open', 'o')];
  for (let i = 2; i <= 7; i += 1) list = pushVersion(list, v(i * 10000, 'ai', `t${i}`), limits);
  assert.equal(list.length, 4);
  assert.equal(list[0].who, 'open');
  assert.deepEqual(list.slice(1).map(x => x.ts), ['t5', 't6', 't7']);
});

test('ids stay increasing when two versions land on the same millisecond', () => {
  const list = pushVersion([v(5, 'open', 'a')], v(5, 'ai', 'b'), limits);
  assert.equal(list[1].id, 6);
});

test('trimProject drops the oldest of the project, never open nor the latest of a page', () => {
  const big = 'x'.repeat(100);
  const records: IPageVersionsRecord[] = [
    { key: 'p/a', project: 1, versions: [v(1, 'open', big), v(2, 'me', big + '1'), v(9, 'me', big + '2')] },
    { key: 'p/b', project: 1, versions: [v(3, 'me', big + '3'), v(4, 'me', big + '4')] },
  ];
  const one = versionBytes(records[0].versions[0]);
  const total = records.reduce((n, r) => n + r.versions.reduce((m, x) => m + versionBytes(x), 0), 0);
  const changed = trimProject(records, total - one); // room for one fewer version
  assert.equal(changed.length, 1);
  assert.equal(changed[0].key, 'p/a');
  assert.deepEqual(changed[0].versions.map(x => x.id), [1, 9]);
  // Nothing droppable left: it stops instead of looping.
  const stuck = trimProject([{ key: 'k', project: 1, versions: [v(1, 'open', big), v(2, 'me', big)] }], 1);
  assert.deepEqual(stuck, []);
  assert.deepEqual(trimProject(records, Number.MAX_SAFE_INTEGER), []);
});

test('newerThan and regenAfter look only after the version', () => {
  const list = [v(1, 'open', 'a'), v(2, 'regen', 'b'), v(3, 'me', 'c'), v(4, 'ai', 'd')];
  assert.equal(newerThan(list, list[1]), 2);
  assert.ok(regenAfter(list, list[0]));
  assert.ok(!regenAfter(list, list[1]));
  assert.equal(pageVersionKey({ project: 999999, folder: 'm/web/desktop/page11', shortName: 'home' }), '999999/m/web/desktop/page11/home');
});

test('groupTimeline: newest first, the newest alone, runs of the same kind folded', () => {
  const day = Date.UTC(2026, 10, 24, 15, 30);
  const at = (min: number) => day + min * 60000;
  const list = [
    v(1, 'open', 'o', { at: at(0) }),
    v(2, 'me', 'a', { at: at(1) }),
    v(3, 'me', 'b', { at: at(2) }),
    v(4, 'me', 'c', { at: at(2) }),
    v(5, 'restore', 'd', { at: at(5) }),
    v(6, 'restore', 'e', { at: at(6) }),
    v(7, 'restore', 'f', { at: at(7) }),
  ];
  const shape = groupTimeline(list).map(e => e.kind === 'one' ? `${e.version.who}:${e.version.id}` : `${e.who}x${e.versions.length}`);
  // The newest restore stays on its own; the two before it fold; the three edits fold; open alone.
  assert.deepEqual(shape, ['restore:7', 'restorex2', 'mex3', 'open:1']);
});

test('groupTimeline: a regeneration never folds, a lone version stays one, runs do not cross a day', () => {
  const d1 = Date.UTC(2026, 10, 23, 12);
  const d2 = Date.UTC(2026, 10, 24, 12);
  const list = [
    v(1, 'open', 'o', { at: d1 }),
    v(2, 'regen', 'a', { at: d1 + 1 }),
    v(3, 'regen', 'b', { at: d1 + 2 }),
    v(4, 'me', 'c', { at: d1 + 3 }),
    v(5, 'me', 'd', { at: d2 }),
    v(6, 'ai', 'e', { at: d2 + 1 }),
  ];
  const shape = groupTimeline(list).map(e => e.kind === 'one' ? `${e.version.who}:${e.version.id}` : `${e.who}x${e.versions.length}`);
  assert.deepEqual(shape, ['ai:6', 'me:5', 'me:4', 'regen:3', 'regen:2', 'open:1']);
  assert.deepEqual(groupTimeline([]), []);
});

test('the store appends, lists and trims through its backend', async () => {
  const backend = memoryBackend();
  const store = new PageVersionsStore(backend, limits, Number.MAX_SAFE_INTEGER);
  const page = { project: 999999, folder: 'm/web/desktop/page11', shortName: 'home' };
  await store.append(page, v(1, 'open', 'a'));
  const after = await store.append(page, v(2, 'me', 'b'));
  assert.deepEqual(after?.map(x => x.ts), ['a', 'b']);
  assert.deepEqual((await store.list(page)).map(x => x.ts), ['a', 'b']);
  assert.deepEqual(await store.list({ ...page, shortName: 'other' }), []);
  assert.ok(store.available);
});

test('a failing backend is silent: empty list, null append, unavailable', async () => {
  const broken: IPageVersionsBackend = {
    get: async () => { throw new Error('quota'); },
    put: async () => { throw new Error('quota'); },
    listProject: async () => { throw new Error('quota'); },
  };
  const store = new PageVersionsStore(broken, limits);
  const page = { project: 999999, folder: 'm/web/desktop/page11', shortName: 'home' };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(await store.list(page), []);
    assert.equal(await store.append(page, v(1, 'open', 'a')), null);
  } finally {
    console.warn = warn;
  }
  assert.equal(store.available, false);
});
