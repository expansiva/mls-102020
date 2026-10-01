/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3CompileProof.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { compileM3FinalSources, m3InfoForPath, m3ReadStor, type M3FinalSource, type M3StudioCompiler } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3CompileProof.js';

const PATH = 'l2/controleEstoque/web/contracts/produtos.ts';
const SOURCE = 'export const x = 1;\n';
const file: M3FinalSource = { pageId: 'produtos', kind: 'contract', path: PATH, source: SOURCE };
const hashes = new Map([[PATH, 'sha256:abc']]);

function fakeStudio(over: Partial<M3StudioCompiler> & { model?: string; stor?: string | null; errors?: string[]; missing?: string[] } = {}): M3StudioCompiler & { calls: string[] } {
  const calls: string[] = [];
  const model = { model: { getValue: () => over.model ?? SOURCE }, compilerResults: { errors: over.errors ?? [] } };
  return {
    calls,
    available: () => true,
    readStor: async () => (over.stor === undefined ? SOURCE : over.stor),
    getModel: async () => model,
    preload: async () => over.missing ?? [],
    compile: async () => ({ errors: over.errors ?? [] }),
    enter: () => { calls.push('enter'); },
    leave: () => { calls.push('leave'); },
    release: () => { calls.push('release'); },
    ...over,
  } as M3StudioCompiler & { calls: string[] };
}

test('m3InfoForPath maps a generated ts and a json path', () => {
  assert.deepEqual(m3InfoForPath(102047, PATH), { project: 102047, level: 2, folder: 'controleEstoque/web/contracts', shortName: 'produtos', extension: '.ts' });
  assert.deepEqual(m3InfoForPath(1, 'l2/m/pipeline/x/produtosReceipt.json'), { project: 1, level: 2, folder: 'm/pipeline/x', shortName: 'produtosReceipt', extension: '.json' });
  assert.throws(() => m3InfoForPath(1, 'web/x.ts'), /M3_PATH_UNSUPPORTED/u);
});

test('a clean compile passes and always leaves and releases', async () => {
  const studio = fakeStudio();
  const [proof] = await compileM3FinalSources(102047, [file], hashes, studio);
  assert.deepEqual(proof, { path: PATH, sha256: 'sha256:abc', status: 'passed', diagnostics: [] });
  assert.deepEqual(studio.calls, ['enter', 'leave', 'release']);
});

test('a compile error fails with the diagnostics', async () => {
  const [proof] = await compileM3FinalSources(102047, [file], hashes, fakeStudio({ errors: ['TS2322: bad'] }));
  assert.equal(proof.status, 'failed');
  assert.deepEqual(proof.diagnostics, ['TS2322: bad']);
});

test('a missing import in the preload fails', async () => {
  const [proof] = await compileM3FinalSources(102047, [file], hashes, fakeStudio({ missing: ['_102029_/l2/bffClient.ts'] }));
  assert.equal(proof.status, 'failed');
  assert.match(proof.diagnostics[0], /Studio imports unavailable: _102029_\/l2\/bffClient\.ts/u);
});

test('an unavailable compiler fails every file', async () => {
  const studio = fakeStudio({ available: () => false });
  const [proof] = await compileM3FinalSources(102047, [file], hashes, studio);
  assert.equal(proof.status, 'failed');
  assert.deepEqual(proof.diagnostics, ['Studio TypeScript compiler is unavailable']);
  assert.deepEqual(studio.calls, ['release']);
});

test('a model or storage with different bytes fails', async () => {
  const [byModel] = await compileM3FinalSources(102047, [file], hashes, fakeStudio({ model: 'export const x = 2;\n' }));
  assert.match(byModel.diagnostics[0], /Studio model is unavailable or differs/u);
  const [byStor] = await compileM3FinalSources(102047, [file], hashes, fakeStudio({ stor: 'other' }));
  assert.match(byStor.diagnostics[0], /Studio storage differs/u);
});

// D-012: the real readSourceText runs against a stub of globalThis.mls reproducing the measured Studio state.
async function withStor<T>(fileFor: (key: string) => unknown, run: () => Promise<T>): Promise<T> {
  const g = globalThis as { mls?: unknown };
  const had = Object.prototype.hasOwnProperty.call(g, 'mls');
  const previous = g.mls;
  g.mls = { stor: { getKeyToFile: () => 'k', files: { k: fileFor('k') } } };
  try { return await run(); } finally { if (had) g.mls = previous; else delete g.mls; }
}
const infoOf = () => m3InfoForPath(102047, PATH);

test('m3ReadStor falls back to getContent for a new file whose model was released', async () => {
  const stored = { status: 'new', versionRef: '0', getValueInfo: async () => ({ content: null }), getContent: async () => SOURCE };
  assert.equal(await withStor(() => stored, () => m3ReadStor(infoOf())), SOURCE);
});

test('m3ReadStor reads a saved file from getValueInfo without calling getContent', async () => {
  let contentCalls = 0;
  const stored = { status: 'unchanged', versionRef: '5', getValueInfo: async () => ({ content: SOURCE }), getContent: async () => { contentCalls++; return 'other'; } };
  assert.equal(await withStor(() => stored, () => m3ReadStor(infoOf())), SOURCE);
  assert.equal(contentCalls, 0);
});

test('m3ReadStor returns null for an absent file', async () => {
  assert.equal(await withStor(() => undefined, () => m3ReadStor(infoOf())), null);
});

test('m3ReadStor returns null for a deleted file', async () => {
  const stored = { status: 'deleted', versionRef: '0', getValueInfo: async () => ({ content: null }), getContent: async () => SOURCE };
  assert.equal(await withStor(() => stored, () => m3ReadStor(infoOf())), null);
});

test('m3ReadStor returns null when getContent throws', async () => {
  const stored = { status: 'new', versionRef: '0', getValueInfo: async () => ({ content: null }), getContent: async () => { throw new Error('boom'); } };
  assert.equal(await withStor(() => stored, () => m3ReadStor(infoOf())), null);
});
