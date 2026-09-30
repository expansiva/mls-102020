/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/compile.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { compileD2FinalSources, type D2FinalSource, type D2StudioCompiler } from '/_102020_/l2/agentDefsL2/steps/finalize60/compile.js';

void test('Studio compiles exactly the desktop and mobile page11 sources and blocks when unavailable', async () => {
  const identity = { project: 102047, module: 'controleEstoque' };
  const sources: D2FinalSource[] = (['desktop', 'mobile'] as const).map(device => ({ pageId: 'produtos', kind: device === 'desktop' ? 'desktopPage' : 'mobilePage',
    path: `l2/controleEstoque/web/${device}/page11/produtos.defs.ts`, source: `export const definition = { device: '${device}' } as const;` }));
  const hashes = new Map(sources.map(source => [source.path, `sha256:${source.kind}`]));
  const seen: string[] = [];
  const sourceByFolder = new Map(sources.map(source => [source.path.replace(/^l2\//u, '').replace(/\.defs\.ts$/u, ''), source.source]));
  const studio: D2StudioCompiler = {
    available: () => true,
    readStor: async info => sourceByFolder.get(`${info.folder}/${info.shortName}`) ?? null,
    getModel: async info => { const value = sourceByFolder.get(`${info.folder}/${info.shortName}`); return value ? { model: { getValue: () => value }, compilerResults: { errors: [] } } : null; },
    preload: async () => [],
    compile: async info => { seen.push(`${info.folder}/${info.shortName}`); return { errors: [] }; },
    release: () => undefined,
  };
  const proofs = await compileD2FinalSources(identity, sources, hashes, studio);
  assert.deepEqual(proofs.map(proof => proof.status), ['passed', 'passed']);
  assert.deepEqual(seen.sort(), ['controleEstoque/web/desktop/page11/produtos', 'controleEstoque/web/mobile/page11/produtos']);
  assert.deepEqual(await compileD2FinalSources(identity, sources, hashes, { ...studio, available: () => false }),
    sources.map(source => ({ path: source.path, sha256: hashes.get(source.path), status: 'failed', diagnostics: ['Studio TypeScript compiler is unavailable'] })));
});
