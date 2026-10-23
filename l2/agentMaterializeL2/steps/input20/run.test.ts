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
const fixture = JSON.parse(readFileSync(new URL('./fixtures/reembolsoDespesas.json', import.meta.url), 'utf8')) as Fixture;
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
  for (const folder of ['financialTransactions', 'approvalWorkflow']) put({ project: 102020, level: 4, folder: `collabux/templates/${folder}`, shortName: 'page21', extension: '.md' }, '# template');
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

test('discovers every page, accepts them, and persists input.json once', async () => {
  const port = memoryPort();
  const first = await runM4Input(identity, port);
  assert.deepEqual(first.snapshot.pages.map(page => page.pageId), ['despesas_aprovadas', 'despesas_da_equipe', 'inicio', 'minhas_despesas']);
  assert.deepEqual(first.snapshot.accepted, ['despesas_aprovadas', 'despesas_da_equipe', 'inicio', 'minhas_despesas']);
  assert.equal(first.path, 'l2/reembolsoDespesas/pipeline/agentMaterializeL2/input.json');
  assert.deepEqual(port.writes, [`${identity.project}/l2/reembolsoDespesas/pipeline/agentMaterializeL2/input.json`]);
  assert.ok(first.snapshot.pages.every(page => page.units.length === 4), 'every accepted page has four units');
  const second = await runM4Input(identity, port);
  assert.equal(second.written, false, 'same inputs, no write');
  assert.equal(second.snapshot.snapshotHash, first.snapshot.snapshotHash);
});

test('an accepted page gets four units (no contract unit, D1), and a mobile edit changes only the mobile and tests fingerprints', async () => {
  const port = memoryPort();
  const before = await runM4Input(identity, port);
    assert.deepEqual(Object.keys(unitHashes(before.snapshot, 'minhas_despesas')), ['shared', 'desktop', 'mobile', 'tests']);
  const mobilePath = `${identity.project}/l2/${identity.module}/web/mobile/page11/minhas_despesas.defs.ts`;
  port.files.set(mobilePath, port.files.get(mobilePath)!.replace('"intent": "', '"intent": "Revisado. '));
  const after = await runM4Input(identity, port);
  const [b, a] = [unitHashes(before.snapshot, 'minhas_despesas'), unitHashes(after.snapshot, 'minhas_despesas')];
  assert.equal(a.shared, b.shared);
  assert.equal(a.desktop, b.desktop);
  assert.notEqual(a.mobile, b.mobile);
  assert.notEqual(a.tests, b.tests);
  assert.equal(after.written, true);
});

test('a page with a missing file is discovered and refused by name', async () => {
  const port = memoryPort();
  port.files.delete(`${identity.project}/l2/${identity.module}/web/contracts/inicio.defs.ts`);
  const { snapshot } = await runM4Input(identity, port);
  const inicio = snapshot.pages.find(page => page.pageId === 'inicio')!;
  assert.equal(inicio.inputs.contract, null);
  assert.ok(inicio.problems.some(item => item.code === 'M4_INPUT_DEFS_MISSING'));
});

test('the report lists errors before warnings, one per line', async () => {
  const port = memoryPort();
  port.files.delete(`${identity.project}/l2/${identity.module}/web/contracts/inicio.defs.ts`);
  const { snapshot } = await runM4Input(identity, port);
  const lines = formatM4InputReport(snapshot).split('\n');
  assert.match(lines[0], /3 page\(s\) accepted \[despesas_aprovadas, despesas_da_equipe, minhas_despesas\], 1 refused \[inicio\]/u);
  const firstWarning = lines.findIndex(line => line.startsWith('warning'));
  const errorsEnd = firstWarning < 0 ? lines.length : firstWarning;
  assert.ok(errorsEnd > 1 && lines.slice(1, errorsEnd).every(line => line.startsWith('error')));
  assert.ok(lines.slice(errorsEnd).every(line => line.startsWith('warning')));
});

// 14/10/2026: web/<device>/page21/ holds a UX variant of the page; input.json lists it with one unit per device.
test('a variant folder is discovered, gated and stored in input.json with a unit per device', async () => {
  const port = memoryPort();
  for (const device of ['desktop', 'mobile'] as const) {
    const from = `${identity.project}/l2/${identity.module}/web/${device}/page11/minhas_despesas.defs.ts`;
    port.files.set(`${identity.project}/l2/${identity.module}/web/${device}/page21/minhas_despesas.defs.ts`, port.files.get(from)!.replace(`/web/${device}/page11/`, `/web/${device}/page21/`));
  }
  const { snapshot } = await runM4Input(identity, port);
  const page = snapshot.pages.find(item => item.pageId === 'minhas_despesas')!;
  assert.equal(page.status, 'accepted');
  assert.deepEqual(page.variants?.map(variant => [variant.genome, variant.status, variant.units.map(unit => unit.unitId)]), [
    ['page21', 'accepted', ['minhas_despesas__desktop__page21', 'minhas_despesas__mobile__page21']],
  ]);
  assert.equal(page.variants?.[0].inputs.mobile?.path, 'l2/reembolsoDespesas/web/mobile/page21/minhas_despesas.defs.ts');
  assert.equal(snapshot.pages.find(item => item.pageId === 'inicio')!.variants, undefined, 'a page with no variant folder has none');
});

// 14/10/2026: adding en-US and es-ES to module.defs.ts regenerated every shared; only the pages write text.
test('a change of product languages keeps the shared fingerprint and changes the page ones', async () => {
  const port = memoryPort();
  const moduleKey = `${identity.project}/l4/${identity.module}/module.defs.ts`;
  port.files.set(moduleKey, `export const m = ${JSON.stringify({ moduleId: identity.module, title: 'Reembolso', productLanguages: ['pt-BR'], defaultLanguage: 'pt-BR' }, null, 2)} as const;\n`);
  const before = await runM4Input(identity, port);
  port.files.set(moduleKey, `export const m = ${JSON.stringify({ moduleId: identity.module, title: 'Reembolso', productLanguages: ['pt-BR', 'en-US', 'es-ES'], defaultLanguage: 'pt-BR' }, null, 2)} as const;\n`);
  const after = await runM4Input(identity, port);
  const [b, a] = [unitHashes(before.snapshot, 'minhas_despesas'), unitHashes(after.snapshot, 'minhas_despesas')];
  assert.equal(a.shared, b.shared, 'the shared is reused');
  assert.notEqual(a.desktop, b.desktop);
  assert.notEqual(a.mobile, b.mobile);
});

// TASK-102020-genome-ux-3 (22/10/2026): the variant gate reads the template's `## Molecule rules`. The variant unit hash
// already has the full template text, so a change of rules re-evaluates the variant and changes its units.
test('a change of the template rules re-evaluates the variant: forbidding a group it uses refuses it', async () => {
  const port = memoryPort();
  const category = '_102020_/l4/collabux/templates/approvalWorkflow/page21.md';
  for (const device of ['desktop', 'mobile'] as const) {
    const from = `${identity.project}/l2/${identity.module}/web/${device}/page11/minhas_despesas.defs.ts`;
    port.files.set(`${identity.project}/l2/${identity.module}/web/${device}/page21/minhas_despesas.defs.ts`, port.files.get(from)!.replace(`/web/${device}/page11/`, `/web/${device}/page21/`));
  }
  assert.ok(port.files.get(`${identity.project}/l2/${identity.module}/web/desktop/page21/minhas_despesas.defs.ts`)!.includes(`"${category}"`));
  const templateKey = '102020/l4/collabux/templates/approvalWorkflow/page21.md';
  const rules = (forbid: string[]) => `# template\n\n## Molecule rules\n\n\`\`\`json\n${JSON.stringify({ axes: {}, groups: { prefer: [], forbid } })}\n\`\`\`\n`;
  const variant = (snapshot: M4InputSnapshot) => snapshot.pages.find(item => item.pageId === 'minhas_despesas')!.variants![0];

  port.files.set(templateKey, rules(['groupViewChart']));
  const allowed = await runM4Input(identity, port);
  assert.equal(variant(allowed.snapshot).status, 'accepted');
  port.files.set(templateKey, rules(['groupViewTable']));
  const forbidden = await runM4Input(identity, port);
  assert.equal(forbidden.written, true);
  assert.equal(variant(forbidden.snapshot).status, 'refused');
  assert.deepEqual(variant(forbidden.snapshot).units, []);
  assert.ok(forbidden.snapshot.pages.find(item => item.pageId === 'minhas_despesas')!.problems.some(item => item.code === 'M4_INPUT_VARIANT_MOLECULE_FORBIDDEN'));
  port.files.set(templateKey, rules(['groupViewChart', 'groupEnterDate']));
  const changed = await runM4Input(identity, port);
  assert.equal(variant(changed.snapshot).status, 'refused', 'minhas_despesas uses groupenterdate');
  port.files.set(templateKey, `${rules(['groupViewChart'])}\nMore text.\n`);
  const again = await runM4Input(identity, port);
  assert.equal(variant(again.snapshot).status, 'accepted');
  // 22/10/2026: a template is agent material; its text (rules aside, which decide acceptance) is not in the data hash.
  assert.deepEqual(variant(again.snapshot).units.map(unit => unit.inputHash), variant(allowed.snapshot).units.map(unit => unit.inputHash), 'the template text is not in the unit hash');
});
