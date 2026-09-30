import test from 'node:test';
import assert from 'node:assert/strict';
import { integratedHost } from '/_102020_/l2/agentDefsL2/steps/finalize60/fixtures/integrated.js';
import { finalizeD2 } from '/_102020_/l2/agentDefsL2/steps/finalize60/run.js';
import { gateD2FinalSources } from '/_102020_/l2/agentDefsL2/steps/finalize60/gate.js';

test('integrated renamed two-page fixture compiles eight declarative files, finalizes and reuses without writes', async () => {
  const host = await integratedHost();
  for (const id of host.snapshot.selection.writePageIds) await host.approve(id);
  const manifest = await host.finishPages(); assert.equal(manifest?.units.length, 2);
  const result = await finalizeD2(host.identity, { compile: host.compileProof, molecular: host.molecular });
  assert.equal(result.report.status, 'complete', result.report.pending.join('; '));
  assert.equal(result.report.compilation.length, 8);
  assert.ok(result.report.compilation.every(proof => proof.status === 'passed'));
  const products = result.report.artifactPaths.map(ref => host.content.get(ref)!);
  assert.ok(products.every(source => !source.includes('export const pipeline')));
  assert.ok([...host.content.keys()].filter(ref => ref.startsWith('l2/libraryReview/web/')).every(ref => ref.endsWith('.defs.ts')));
  const bytes = [...host.content]; const writes = host.writes.length;
  for (const id of host.snapshot.selection.writePageIds) await host.approve(id, 2);
  await host.finishPages();
  const reused = await finalizeD2(host.identity, { compile: host.compileProof, molecular: host.molecular });
  assert.equal(reused.report.status, 'complete');
  assert.deepEqual([...host.content], bytes);
  assert.equal(host.writes.length, writes);
});

test('finalize fails closed for compiler absence, incomplete proofs and reference drift', async () => {
  const host = await integratedHost(['catalog']);
  await host.approve('catalog'); await host.finishPages();
  const unavailable = await finalizeD2(host.identity, { molecular: host.molecular });
  assert.equal(unavailable.report.status, 'blocked');
  assert.ok(unavailable.report.compilation.every(proof => proof.status === 'failed'));
  const missing = await finalizeD2(host.identity, { molecular: host.molecular, compile: async () => [] });
  assert.equal(missing.report.status, 'blocked');
  const stale = await finalizeD2(host.identity, { molecular: host.molecular, compile: async (_identity, sources) => sources.map(source => ({ path: source.path, sha256: 'stale', status: 'passed', diagnostics: [] })) });
  assert.equal(stale.report.status, 'blocked');
  host.put('l2/designSystem.ts', 'export const palette = "changed";');
  const changed = await finalizeD2(host.identity, { molecular: host.molecular, compile: host.compileProof });
  assert.equal(changed.report.status, 'blocked');
  assert.match(changed.report.pending.join(';'), /CONTEXT_CHANGED/);
});

test('final graph rejects missing files, forged refs and serialized execution metadata', async () => {
  const host = await integratedHost(['catalog']); await host.approve('catalog'); await host.finishPages();
  const sources = host.snapshot.selection.pages.flatMap(page => page.destinations.map(destination => ({ pageId: page.pageId, kind: destination.kind, path: destination.path, source: host.content.get(destination.path)! })));
  const shared = JSON.parse(host.content.get(host.prefix + '/shared.json')!).units[0];
  const pages = JSON.parse(host.content.get(host.prefix + '/pages.json')!).units[0];
  const symbols = [...shared.symbols, ...pages.symbols.desktop, ...pages.symbols.mobile];
  assert.doesNotThrow(() => gateD2FinalSources(host.snapshot, sources, symbols));
  assert.throws(() => gateD2FinalSources(host.snapshot, sources.slice(1), symbols), /OUTPUT_SET/);
  const altered = sources.map(source => source.kind === 'mobilePage' ? { ...source, source: source.source.replace('web/shared/catalog.defs.ts', 'web/shared/missing.defs.ts') } : source);
  assert.throws(() => gateD2FinalSources(host.snapshot, altered, symbols), /REFERENCE_MISSING|PAGE_REF_INVALID/);
  const pipeline = sources.map(source => source.kind === 'shared' ? { ...source, source: source.source + '\nexport const pipeline = [] as const;\n' } : source);
  assert.throws(() => gateD2FinalSources(host.snapshot, pipeline, symbols), /RENDER_EXPORTS/);
});
