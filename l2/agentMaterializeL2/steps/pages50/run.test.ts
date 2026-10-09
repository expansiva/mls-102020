/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { approveM4Shared, buildM4SharedContext } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import {
  M4_PAGE_GATE_ENFORCED, approveM4Page, buildM4PageContext, buildM4PagePrompt, buildM4PageRepairPrompt, designTokenNames, m4PageDesign, m4PageEnvironmentFailure, m4PageToolAnswer, productLocales, reusableM4Page, type M4PagePort,
} from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';

interface Fixture { project: number; module: string; knownMolecules: string[]; pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }> }
const fixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;
const sharedRef = (JSON.parse(readFileSync(new URL('../shared40/fixtures/produtosShared.json', import.meta.url), 'utf8')) as { source: string }).source;
const pageRef = JSON.parse(readFileSync(new URL('./fixtures/produtosDesktop.json', import.meta.url), 'utf8')) as { source: string; sharedDeclaration: string };
const BASE = new URL('../../../../../', import.meta.url);
const real = (path: string) => readFileSync(new URL(path, BASE), 'utf8');
function listIn(files: Map<string, string>, project: number, folder: string, level: number): string[] {
  const prefix = `${project}/l${level}/${folder}/`;
  return [...files.keys()].filter(item => item.startsWith(prefix) && item.endsWith('.defs.ts') && !item.slice(prefix.length).includes('/')).map(item => item.slice(item.lastIndexOf('/') + 1, -'.defs.ts'.length));
}
const identity = { project: fixture.project, module: fixture.module };
const key = (info: Ns5FileInfo) => `${info.project}/l${info.level}/${info.folder ? `${info.folder}/` : ''}${info.shortName}${info.extension}`;

/** In-memory Studio with the real design system, module, molecule indexes and usage contracts. */
async function studio(compileErrors: string[] = []) {
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const folders = { contract: 'web/contracts', shared: 'web/shared', desktop: 'web/desktop/page11', mobile: 'web/mobile/page11' } as const;
  for (const [pageId, row] of Object.entries(fixture.pages)) {
    for (const [kind, folder] of Object.entries(folders)) put({ project: identity.project, level: 2, folder: `${identity.module}/${folder}`, shortName: pageId, extension: '.defs.ts' }, row[kind as keyof typeof row]);
  }
  put({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pipeline', extension: '.json' }, JSON.stringify({ status: 'complete' }));
  put({ project: 102020, level: 4, folder: 'collabux/templates/inventoryControl', shortName: 'page21', extension: '.md' }, real('mls-102020/l4/collabux/templates/inventoryControl/page21.md'));
  put({ project: identity.project, level: 2, folder: '', shortName: 'designSystem', extension: '.ts' }, real('mls-102047/l2/designSystem.ts'));
  put({ project: identity.project, level: 4, folder: identity.module, shortName: 'module', extension: '.defs.ts' }, real('mls-102047/l4/controleEstoque/module.defs.ts'));
  for (const group of new Set(fixture.knownMolecules.map(tag => tag.split('--')[0]))) {
    const index = real(`mls-102040/l2/molecules/${group}/index.defs.ts`);
    put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: 'index', extension: '.defs.ts' }, index);
    const usage = /usageContract\s*=\s*'\/_102020_\/l2\/(aura\/molecules\/skills\/[^/]+)\/usage'/u.exec(index)?.[1];
    if (usage && existsSync(new URL(`mls-102020/l2/${usage}/usage.ts`, BASE))) put({ project: 102020, level: 2, folder: usage, shortName: 'usage', extension: '.ts' }, real(`mls-102020/l2/${usage}/usage.ts`));
  }
  // the molecule's own skill (its .defs.ts), when the real file exists
  for (const tag of fixture.knownMolecules) {
    const [group, name] = tag.split('--');
    const path = `mls-102040/l2/molecules/${group}/${name}.defs.ts`;
    if (existsSync(new URL(path, BASE))) put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: name, extension: '.defs.ts' }, real(path));
  }
  put({ project: 102020, level: 2, folder: 'molecules', shortName: 'ml-scenary', extension: '.defs.ts' }, real('mls-102020/l2/molecules/ml-scenary.defs.ts'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/shared40', shortName: 'prompt', extension: '.md' }, real('mls-102020/l2/agentMaterializeL2/steps/shared40/prompt.md'));
  // The real L4 of the module, as the Studio serves it (level 4).
  const l4Root = new URL(`mls-102047/l4/${identity.module}/`, BASE);
  for (const sub of ['', 'ontology/', 'journeys/']) {
    const dir = new URL(sub, l4Root);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(item => item.endsWith('.defs.ts'))) {
      put({ project: identity.project, level: 4, folder: `${identity.module}${sub ? `/${sub.slice(0, -1)}` : ''}`, shortName: name.slice(0, -'.defs.ts'.length), extension: '.defs.ts' }, readFileSync(new URL(name, dir), 'utf8'));
    }
  }
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'prompt', extension: '.md' }, real('mls-102020/l2/agentMaterializeL2/steps/pages50/prompt.md'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'promptRepair', extension: '.md' }, real('mls-102020/l2/agentMaterializeL2/steps/pages50/promptRepair.md'));
  const compiled: string[] = [];
  const port: M4PagePort & { files: Map<string, string>; compiled: string[] } = {
    files, compiled,
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    exists: info => files.has(key(info)),
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async (info, text) => { files.set(key(info), text); },
    writeJson: async (info, value) => { files.set(key(info), JSON.stringify(value)); },
    declarations: async () => [],
    listDefs: (project, folder, level) => listIn(files, project, folder, level),
    compile: async info => {
      compiled.push(key(info));
      if (info.folder.endsWith('/web/shared')) return { errors: [], declaration: pageRef.sharedDeclaration };
      return { errors: compileErrors, declaration: null };
    },
  };
  await runM4Input(identity, {
    listDefs: (project, folder, level = 2) => listIn(files, project, folder, level),
    exists: port.exists, read: port.read, readJson: port.readJson, write: port.writeJson,
  });
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), sharedRef, 1, port);
  return port;
}

test('locales and design tokens are read from the real module and design system', () => {
  assert.deepEqual(productLocales(real('mls-102047/l4/controleEstoque/module.defs.ts')), ['pt']);
  assert.deepEqual(productLocales('"productLanguages": ["en-US", "pt-BR"], "defaultLanguage": "pt-BR"'), ['pt', 'en']);
  const tokens = designTokenNames(real('mls-102047/l2/designSystem.ts'));
  assert.ok(tokens.includes('page-bg') && tokens.includes('status-error-text') && !tokens.some(name => name.endsWith('-hover')));
});

test('the page prompt carries target, declaration, page11, tokens, molecules with imports and their usage contracts', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const { humanPrompt } = buildM4PagePrompt(context);
  for (const needle of [
    '- path: _102047_/l2/controleEstoque/web/desktop/page11/produtos.ts',
    '- tag: controle-estoque--web--desktop--page11--produtos-102047',
    '- class: ControleEstoqueDesktopPage11ProdutosPage extends ControleEstoqueProdutosShared',
    '- shared import: /_102047_/l2/controleEstoque/web/shared/produtos.js',
    '- locales (default first): pt',
    'export declare class ControleEstoqueProdutosShared',
    '"experience": "splitViewOperations"',
    '"step": "acompanharSaldos/consultarSaldos"',
    'page-bg, surface-bg',
    "- <groupviewtable--ml-data-table> — import '/_102040_/l2/molecules/groupviewtable/ml-data-table.js'",
    '## Usage contract — groupviewtable',
    '## Molecule — <groupviewtable--ml-data-table>',
    '# view + table — Usage',
    "## Scene host (optional, your decision) — <molecules--ml-scenary-102020>, import '/_102020_/l2/molecules/ml-scenary.js'",
    '- TagName: molecules--ml-scenary-102020',
    // the row fields the declaration only imports (dataHora invented for movimentadoEm, 02/10/2026)
    '# Row types — web/contracts/produtos.defs.ts (the only fields a row has)',
    '# Business context (L4): labels, meanings, rules, journeys, actors',
    '## Entities (meaning and field titles)',
    'export interface ProdutoLoad {',
  ]) assert.ok(humanPrompt.includes(needle), needle);
  assert.equal(context.target.sharedClassName, 'ControleEstoqueProdutosShared');
});

test('the reference page is approved, compiled and reused; a context change regenerates it', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const receipt = await approveM4Page(context, pageRef.source, 1, port);
  assert.equal(receipt.sourcePath, 'l2/controleEstoque/web/desktop/page11/produtos.ts');
  assert.ok(port.compiled.includes('102047/l2/controleEstoque/web/desktop/page11/produtos.ts'));
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true);
  assert.equal(await reusableM4Page(identity, 'produtos', 'mobile', port), false, 'mobile was never generated');
  port.files.set('102020/l4/collabux/templates/inventoryControl/page21.md', `${port.files.get('102020/l4/collabux/templates/inventoryControl/page21.md')}\nnew behavior rule\n`);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), false, 'a template change regenerates the page');
});

test('the receipt keeps the design answer and the design observations; a design choice is never a refusal', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const answer = m4PageToolAnswer({ arguments: JSON.stringify({
    design: { concept: 'A stock desk: the grid stays, the panel switches modes.', views: [{ id: 'base', purpose: 'overview and list' }, { id: 'cadastro', purpose: 'register a product' }], decisions: 'Followed the template panel modes.' },
    source: pageRef.source.replace('data-section-id="cadastro"', 'data-section-id="novo"'),
  }) });
  const receipt = await approveM4Page(context, answer.source, 1, port, answer.design);
  assert.equal(receipt.design?.concept, 'A stock desk: the grid stays, the panel switches modes.');
  assert.deepEqual(receipt.design?.views.map(view => view.id), ['base', 'cadastro']);
  assert.deepEqual(receipt.advisories.map(item => item.code), ['M4_PAGE_SECTION'], 'a renamed section is observed, not refused');
  assert.equal(m4PageDesign('not an object'), null);
});

test('hand-made view switching refuses the page even while the gate is off (02/10)', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const handMade = pageRef.source.replace(/<molecules--ml-scenary-102020[\s\S]*?<\/molecules--ml-scenary-102020>/u, "${this.scenary === 'cadastro' ? this.renderSceneCadastro() : this.renderSceneBase()}");
  await assert.rejects(approveM4Page(context, handMade, 1, port), /M4_PAGE_GATE:\nM4_PAGE_SCENARY_CUSTOM/u);
});

test('a page repair is a focused fix (agentFix style): errors, refused file, its design, the shared declaration', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const diagnostic = "M4_PAGE_COMPILE:\nline 120:30 - TS2339 - Property 'abrirMovimentacao' does not exist on type 'ControleEstoqueDesktopPage11ProdutosPage'.\n    > @action=${() => this.abrirMovimentacao()}";
  const { systemPrompt, humanPrompt } = await buildM4PageRepairPrompt(context, { diagnostic, previous: pageRef.source, design: { concept: 'grid and panel' } }, port);
  assert.equal(systemPrompt, real('mls-102020/l2/agentMaterializeL2/steps/pages50/promptRepair.md'));
  assert.ok(!humanPrompt.includes('## Usage contract'), 'not the generation prompt again');
  for (const needle of ['# Errors', 'TS2339', '# Refused file', '"concept": "grid and panel"', '# Shared declaration', 'export declare class ControleEstoqueProdutosShared', '- locales (every one needs every key): pt', '# Row types', 'export interface ProdutoLoad {']) {
    assert.ok(humanPrompt.includes(needle), needle);
  }
  assert.match(systemPrompt, /^<!-- modelType: code -->/u);
});

test('a page waits for its shared: no receipt, no context', async () => {
  const port = await studio();
  port.files.delete('102047/l2/controleEstoque/pipeline/agentMaterializeL2/shared40/produtos.json');
  await assert.rejects(buildM4PageContext(identity, 'produtos', 'desktop', port), /M4_PAGE_SHARED_NOT_READY/u);
});

test('a gate refusal writes nothing; a compile error leaves no receipt; environment failures are told apart', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  // The gate is not enforced (Guilherme, 01/10/2026): a contract issue is recorded in the receipt, not refused.
  assert.equal(M4_PAGE_GATE_ENFORCED, false);
  const recorded = await approveM4Page(context, pageRef.source.replace("<Label>${this.msg['form.submit']}</Label>", '<Label>Cadastrar</Label>'), 1, port);
  assert.ok(recorded.advisories.some(item => item.code === 'M4_PAGE_TEXT' && item.message.startsWith('[contract] ')));
  const failing = await studio(["line 3:5 - TS2339 - Property 'x' does not exist."]);
  await assert.rejects(approveM4Page(await buildM4PageContext(identity, 'produtos', 'desktop', failing), pageRef.source, 1, failing), /M4_PAGE_COMPILE:\nline 3:5/u);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', failing), false);
  assert.equal(m4PageEnvironmentFailure('M4_PAGE_COMPILE:\nStudio imports unavailable: _102040_/l2/molecules/x.ts'), true);
  assert.equal(m4PageEnvironmentFailure('M4_PAGE_COMPILE:\nline 1:1 - TS2339 - x'), false);
});
