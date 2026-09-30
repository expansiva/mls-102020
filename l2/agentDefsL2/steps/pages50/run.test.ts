/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { integratedHost } from '/_102020_/l2/agentDefsL2/steps/finalize60/fixtures/integrated.js';
import { findReusableD2PagesUnits } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

test('one failed compiler or writer preserves approved sibling and resumes the complete pair', async () => {
  const host = await integratedHost();
  await host.approve('catalog');
  const sibling = [...host.content].filter(([ref]) => ref.includes('catalog'));
  await assert.rejects(() => host.approve('policies', 1, async () => { throw new Error('TS2304 MissingType'); }), /TS2304/);
  assert.equal(host.content.get(host.prefix + '/pages50/results/policies.json'), '');
  assert.equal(await host.finishPages(), null);
  assert.deepEqual([...host.content].filter(([ref]) => ref.includes('catalog')), sibling);
  host.failWrite = 'l2/libraryReview/web/mobile/page11/policies.defs.ts';
  host.put(host.failWrite, '');
  await assert.rejects(() => host.approve('policies', 2), /simulated write failure/);
  host.failWrite = '';
  await host.approve('policies', 2);
  assert.equal((await host.finishPages())?.units.length, 2);
  assert.deepEqual([...host.content].filter(([ref]) => ref.includes('catalog')), sibling);
});

test('current format and sources reuse byte-identically; corrupt page and old receipt do not', async () => {
  const host = await integratedHost();
  for (const id of host.snapshot.selection.writePageIds) await host.approve(id);
  await host.finishPages();
  const before = [...host.content]; const writes = host.writes.length;
  for (const id of host.snapshot.selection.writePageIds) await host.approve(id, 2);
  await host.finishPages();
  assert.deepEqual([...host.content], before);
  assert.equal(host.writes.length, writes);
  host.put('l2/libraryReview/web/mobile/page11/catalog.defs.ts', 'invalid');
  const reusable = () => findReusableD2PagesUnits(host.identity, host.snapshot, undefined, host.skills, { port: host.molecular });
  assert.deepEqual((await reusable()).map(unit => unit.pageId), ['policies']);
  const ref = host.prefix + '/pages50/results/policies.json';
  host.put(ref, JSON.stringify({ ...JSON.parse(host.content.get(ref)!), schemaVersion: 'old' }));
  assert.deepEqual(await reusable(), []);
});

test('whole shared change invalidates both devices while unrelated page remains untouched', async () => {
  const host = await integratedHost();
  for (const id of host.snapshot.selection.writePageIds) await host.approve(id);
  const sibling = [...host.content].filter(([ref]) => ref.includes('policies'));
  const ref = 'l2/libraryReview/web/shared/catalog.defs.ts';
  const changed = host.content.get(ref)!.replace('Read the published catalog guidance.', 'Read revised catalog guidance.');
  host.put(ref, changed);
  const manifestRef = host.prefix + '/shared.json';
  const manifest = JSON.parse(host.content.get(manifestRef)!);
  manifest.units.find((unit: {pageId: string}) => unit.pageId === 'catalog').sourceHash = await sha256Text(changed);
  host.put(manifestRef, JSON.stringify(manifest));
  const reusable = await findReusableD2PagesUnits(host.identity, host.snapshot, undefined, host.skills, { port: host.molecular });
  assert.deepEqual(reusable.map(unit => unit.pageId), ['policies']);
  assert.deepEqual([...host.content].filter(([ref]) => ref.includes('policies')), sibling);
});

test('reference content and catalog discovery hashes invalidate reuse without mtime comparisons', async () => {
  const host = await integratedHost(['catalog']);
  await host.approve('catalog');
  const reusable = () => findReusableD2PagesUnits(host.identity, host.snapshot, undefined, host.skills, { port: host.molecular });
  assert.equal((await reusable()).length, 1);
  host.state.usage = 'Unselected usage changed';
  assert.equal((await reusable()).length, 1);
  host.state.present = true;
  assert.equal((await reusable()).length, 0);
  host.state.present = false;
  const ref = 'l2/designSystem.ts'; const original = host.content.get(ref)!;
  host.put(ref, original + '\n// changed');
  assert.equal((await reusable()).length, 0);
  await host.approve('catalog', 2);
  assert.equal((await reusable()).length, 1, 'same product bytes must refresh changed reference hashes in the receipt');
  host.put(ref, original);
  assert.equal((await reusable()).length, 0);
  await host.approve('catalog', 2);
  assert.equal((await reusable()).length, 1);
  host.content.delete(ref);
  assert.equal((await reusable()).length, 0);
});

test('reference and snapshot changes during approval never approve a stale page', async () => {
  const host = await integratedHost(['catalog']);
  await assert.rejects(() => host.approve('catalog', 1, async () => {
    host.put(host.prefix + '/input.json', JSON.stringify({ ...host.snapshot, snapshotHash: 'changed' }));
  }), /STALE_RUN/);
  assert.equal(host.content.get(host.prefix + '/pages50/results/catalog.json'), '');
});

test('no-op approval also revalidates the snapshot after compilation', async () => {
  const host = await integratedHost(['catalog']);
  await host.approve('catalog');
  await assert.rejects(() => host.approve('catalog', 2, async () => {
    host.put(host.prefix + '/input.json', JSON.stringify({ ...host.snapshot, snapshotHash: 'changed' }));
  }), /STALE_RUN/);
});
