/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Receipt.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildM3Receipt, m3ReceiptFresh, m3ReceiptPath, readM3Sources, readM3UsedApis, resolveProjectRelativeRef,
  type M3Reader,
} from './m3Receipt.js';

const PROJECT = 102047;
const DEF = '_102047_/l2/controleEstoque/web/desktop/page11/produtos.defs.ts';
const OUT = '_102047_/l2/controleEstoque/web/desktop/page11/produtos.ts';
const SRC_A = '_102047_/l2/controleEstoque/web/shared/produtos.ts';
const API = '_102047_/l2/controleEstoque/web/contracts/produtos.ts';
const CODE = `import { X } from '/_102047_/l2/controleEstoque/web/contracts/produtos.js';\nexport const y = 1;\n`;

function store(): Map<string, string> {
  return new Map([[DEF, 'def'], [SRC_A, 'shared'], [API, 'contract'], [OUT, CODE]]);
}
const reader = (map: Map<string, string>): M3Reader => async ref => map.get(ref) ?? null;
const REFS = [DEF, 'l2/controleEstoque/web/shared/produtos.ts', DEF];

async function fresh(map: Map<string, string>, over: Partial<Parameters<typeof m3ReceiptFresh>[0]> = {}): Promise<boolean> {
  return m3ReceiptFresh({ defPath: DEF, outputPath: OUT, sourceRefs: REFS, project: PROJECT, read: reader(map), ...over });
}

async function writeReceipt(map: Map<string, string>): Promise<void> {
  const read = reader(map);
  const sources = await readM3Sources(REFS, PROJECT, read);
  const receipt = await buildM3Receipt({ defPath: DEF, outputPath: OUT, sources, skills: ['s1'], context: ['c1'], output: CODE, project: PROJECT, read });
  map.set(m3ReceiptPath(OUT), JSON.stringify(receipt));
}

test('m3ReceiptPath swaps .ts for Receipt.json', () => {
  assert.equal(m3ReceiptPath('_1_/l2/m/web/desktop/page11/produtos.ts'), '_1_/l2/m/web/desktop/page11/produtosReceipt.json');
});

test('resolveProjectRelativeRef prefixes l<N>/ refs and leaves _NNN_ refs alone', () => {
  assert.equal(resolveProjectRelativeRef('l2/x/a.ts', 102047), '_102047_/l2/x/a.ts');
  assert.equal(resolveProjectRelativeRef('_102020_/l2/x/a.ts', 102047), '_102020_/l2/x/a.ts');
});

test('readM3Sources dedupes after resolving and throws on a missing source', async () => {
  const map = store();
  const sources = await readM3Sources(['l2/controleEstoque/web/shared/produtos.ts', SRC_A], PROJECT, reader(map));
  assert.deepEqual(sources.map(item => item.reference), [SRC_A]);
  await assert.rejects(readM3Sources([SRC_A, '_102047_/l2/nope.ts'], PROJECT, reader(map)), /M3_DECLARED_CONTEXT_MISSING: _102047_\/l2\/nope\.ts/u);
});

test('readM3UsedApis maps .js imports to sorted .ts refs and throws on a missing one', async () => {
  const map = store();
  map.set('_102047_/l2/a/a.ts', 'a');
  const code = `import '/_102047_/l2/controleEstoque/web/contracts/produtos.js';\nexport * from '/_102047_/l2/a/a.js';\n`;
  const apis = await readM3UsedApis(code, PROJECT, reader(map));
  assert.deepEqual(apis.map(item => item.reference), ['_102047_/l2/a/a.ts', API]);
  await assert.rejects(readM3UsedApis(`import '/_102047_/l2/ghost.js';`, PROJECT, reader(map)), /M3_USED_API_MISSING: _102047_\/l2\/ghost\.ts/u);
});

test('round trip: build, store at m3ReceiptPath, then m3ReceiptFresh is true', async () => {
  const map = store();
  await writeReceipt(map);
  assert.equal(JSON.parse(map.get(m3ReceiptPath(OUT))!).usedApis[0].reference, API);
  assert.equal(await fresh(map), true);
});

type FreshCase = [string, (map: Map<string, string>) => void, Partial<Parameters<typeof m3ReceiptFresh>[0]>?];

async function assertTurnsFalse(cases: FreshCase[]): Promise<void> {
  for (const [name, mutate, over] of cases) {
    const map = store();
    await writeReceipt(map);
    assert.equal(await fresh(map), true, `${name}: precondition`);
    mutate(map);
    assert.equal(await fresh(map, over), false, name);
  }
}

test('m3ReceiptFresh turns false when a source, the output or a used API changes, one at a time', async () => {
  await assertTurnsFalse([
    ['a source', map => map.set(SRC_A, 'shared changed')],
    ['the output', map => map.set(OUT, CODE + '// edit\n')],
    ['a used API', map => map.set(API, 'contract changed')],
  ]);
});

test('m3ReceiptFresh turns false when the schemaVersion, the sourceRefs or the receipt itself change', async () => {
  await assertTurnsFalse([
    ['the schemaVersion', map => map.set(m3ReceiptPath(OUT), JSON.stringify({ ...JSON.parse(map.get(m3ReceiptPath(OUT))!), schemaVersion: 'old' }))],
    ['an extra sourceRef', () => undefined, { sourceRefs: [...REFS, API] }],
    ['the receipt (invalid JSON)', map => map.set(m3ReceiptPath(OUT), '{not json')],
  ]);
});
