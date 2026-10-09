/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { formatM4InputReport, runM4Input, type M4InputRunPort, type M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';

interface Fixture {
  project: number;
  module: string;
  defsPipelineStatus: string;
  knownMolecules: string[];
  knownTemplates: string[];
  pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }>;
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;
const identity = { project: fixture.project, module: fixture.module };
const key = (info: Ns5FileInfo) => `${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;

/** An in-memory Studio: the module defs, the agentDefsL2 pipeline, the template and the molecule indexes. */
function memoryPort(): M4InputRunPort & { files: Map<string, string>; writes: string[] } {
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const folders = { contract: 'web/contracts', shared: 'web/shared', desktop: 'web/desktop/page11', mobile: 'web/mobile/page11' } as const;
  for (const [pageId, row] of Object.entries(fixture.pages)) {
    for (const [kind, folder] of Object.entries(folders)) put({ project: identity.project, level: 2, folder: `${identity.module}/${folder}`, shortName: pageId, extension: '.defs.ts' }, row[kind as keyof typeof row]);
  }
  put({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pipeline', extension: '.json' }, JSON.stringify({ status: fixture.defsPipelineStatus }));
  put({ project: 102020, level: 4, folder: 'collabux/templates/inventoryControl', shortName: 'page21', extension: '.md' }, '# inventory template');
  const groups = new Map<string, string[]>();
  for (const tag of fixture.knownMolecules) groups.set(tag.split('--')[0], [...(groups.get(tag.split('--')[0]) ?? []), tag]);
  for (const [group, tags] of groups) put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: 'index', extension: '.defs.ts' }, tags.map(tag => `{ tag: '${tag}' },`).join('\n'));
  const writes: string[] = [];
  return {
    files, writes,
    listDefs: (project, folder) => [...files.keys()].filter(item => item.startsWith(`${project}/l2/${folder}/`) && item.endsWith('.defs.ts') && !item.slice(`${project}/l2/${folder}/`.length).includes('/')).map(item => item.slice(item.lastIndexOf('/') + 1, -'.defs.ts'.length)),
    exists: info => files.has(key(info)),
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    write: async (info, value) => { writes.push(key(info)); files.set(key(info), JSON.stringify(value)); },
  };
}

const unitHashes = (snapshot: M4InputSnapshot, pageId: string) => Object.fromEntries(snapshot.pages.find(page => page.pageId === pageId)!.units.map(unit => [unit.kind, unit.inputHash]));

test('discovers both pages, accepts them, and persists input.json once', async () => {
  const port = memoryPort();
  const first = await runM4Input(identity, port);
  assert.deepEqual(first.snapshot.pages.map(page => page.pageId), ['movimentacoes', 'produtos']);
  assert.deepEqual(first.snapshot.accepted, ['movimentacoes', 'produtos']);
  assert.equal(first.path, 'l2/controleEstoque/pipeline/agentMaterializeL2/input.json');
  assert.deepEqual(port.writes, [`${identity.project}/l2/controleEstoque/pipeline/agentMaterializeL2/input.json`]);
  assert.ok(first.snapshot.pages.every(page => page.units.length === 4), 'every accepted page has four units');
  const second = await runM4Input(identity, port);
  assert.equal(second.written, false, 'same inputs, no write');
  assert.equal(second.snapshot.snapshotHash, first.snapshot.snapshotHash);
});

test('an accepted page gets four units (no contract unit, D1), and a mobile edit changes only the mobile and tests fingerprints', async () => {
  const port = memoryPort();
  const before = await runM4Input(identity, port);
    assert.deepEqual(Object.keys(unitHashes(before.snapshot, 'movimentacoes')), ['shared', 'desktop', 'mobile', 'tests']);
  const mobilePath = `${identity.project}/l2/${identity.module}/web/mobile/page11/movimentacoes.defs.ts`;
  port.files.set(mobilePath, port.files.get(mobilePath)!.replace('"intent": "', '"intent": "Revisado. '));
  const after = await runM4Input(identity, port);
  const [b, a] = [unitHashes(before.snapshot, 'movimentacoes'), unitHashes(after.snapshot, 'movimentacoes')];
  assert.equal(a.shared, b.shared);
  assert.equal(a.desktop, b.desktop);
  assert.notEqual(a.mobile, b.mobile);
  assert.notEqual(a.tests, b.tests);
  assert.equal(after.written, true);
});

test('a page with a missing file is discovered and refused by name', async () => {
  const port = memoryPort();
  port.files.delete(`${identity.project}/l2/${identity.module}/web/contracts/produtos.defs.ts`);
  const { snapshot } = await runM4Input(identity, port);
  const produtos = snapshot.pages.find(page => page.pageId === 'produtos')!;
  assert.equal(produtos.inputs.contract, null);
  assert.ok(produtos.problems.some(item => item.code === 'M4_INPUT_DEFS_MISSING'));
});

test('the report lists errors before warnings, one per line', async () => {
  const port = memoryPort();
  port.files.delete(`${identity.project}/l2/${identity.module}/web/contracts/produtos.defs.ts`);
  const { snapshot } = await runM4Input(identity, port);
  const lines = formatM4InputReport(snapshot).split('\n');
  assert.match(lines[0], /1 page\(s\) accepted \[movimentacoes\], 1 refused \[produtos\]/u);
  const firstWarning = lines.findIndex(line => line.startsWith('warning'));
  const errorsEnd = firstWarning < 0 ? lines.length : firstWarning;
  assert.ok(errorsEnd > 1 && lines.slice(1, errorsEnd).every(line => line.startsWith('error')));
  assert.ok(lines.slice(errorsEnd).every(line => line.startsWith('warning')));
});
