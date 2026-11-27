/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { approveM4Shared, buildM4SharedContext } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { M4_REUSE_FINGERPRINT } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { reviewReceiptInfo } from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';
import {
  M4_CONNECTION_REFUSED_LINE, M4_PAGE_GATE_ENFORCED, approveM4Page, buildM4PageContext, buildM4PagePrompt, buildM4PageRepairPrompt, designTokenNames, m4CheckExistingPage, m4ConnectionCallsSection, m4MoveI18nBeforeClass, m4PageCurrent, m4PlatformTypes, m4PageDesign, m4PageEnvironmentFailure, m4PageToolAnswer, m4RouteOutputs, m4ServedJourneySteps, pageReceiptInfo, productLocales, reusableM4Page, studioPagePort, type M4PagePort,
} from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { createAgent as createPageAgent } from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4PagesPage.js';
import { gateM4PageSource, m4MoleculeSurfaceLine } from '/_102020_/l2/agentMaterializeL2/steps/pages50/gate.js';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { sha256Text } from '/_102020_/l2/agentMaterializeL2/helpers/hash.js';
import { defsWithoutHistory, withDefsHistory, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import type { M4InputPage, M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';

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
  put({ project: 102034, level: 1, folder: 'mdm/defs', shortName: 'ontology', extension: '.ts' }, real('mls-102034/l1/mdm/defs/ontology.ts'));
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
    deleteText: async info => { files.delete(key(info)); },
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
  assert.deepEqual(productLocales(real('mls-102047/l4/controleEstoque/module.defs.ts')), ['pt-br']);
  assert.deepEqual(productLocales('"productLanguages": ["en-US", "pt-BR"], "defaultLanguage": "pt-BR"'), ['pt-br', 'en-us']);
  // 14/10/2026: two regions of one language are two catalogues, and two spellings of one code are one
  assert.deepEqual(productLocales('"productLanguages": ["pt-BR", "pt-PT", "pt_br"], "defaultLanguage": "pt-BR"'), ['pt-br', 'pt-pt']);
  const tokens = designTokenNames(real('mls-102047/l2/designSystem.ts'));
  assert.ok(tokens.includes('page-bg') && tokens.includes('status-error-text') && !tokens.some(name => name.endsWith('-hover')));
});

test('a molecule surface line is the properties and detail keys of its real .ts', () => {
  const propertiesOf = (line: string) => line.split('; events')[0].replace(/^.*properties\s/u, '').split(',').map(item => item.trim()).filter(Boolean);
  const address = m4MoleculeSurfaceLine('groupentertext--ml-address-field', real('mls-102040/l2/molecules/groupentertext/ml-address-field.ts'));
  assert.match(address, /events .*change \{field, value\}/);
  assert.match(address, /address-confirmed \{address\}/);
  assert.equal(propertiesOf(address).includes('value'), false);
  const enter = m4MoleculeSurfaceLine('groupentertext--ml-enter-text', real('mls-102040/l2/molecules/groupentertext/ml-enter-text.ts'));
  assert.match(enter, /change \{value\}/);
  assert.equal(propertiesOf(enter).includes('value'), true);
  const unread = m4MoleculeSurfaceLine('x', "this.dispatchEvent(new CustomEvent('change', { detail: { [name]: 1 } }));");
  assert.match(unread, /change \{keys not read\}/);
  const table = m4MoleculeSurfaceLine('groupviewtable--ml-record-form-table', real('mls-102040/l2/molecules/groupviewtable/ml-record-form-table.ts'));
  assert.match(table, /change \{keys not read\}/);
  assert.match(table, /rowClick \{keys not read\}/);
});

test('the page prompt carries target, declaration, page11, tokens, molecules with imports and their usage contracts', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const { systemPrompt, humanPrompt } = buildM4PagePrompt(context);
  assert.ok(systemPrompt.includes('follows the same rule on desktop and on mobile; how it looks is free'));
  assert.ok(systemPrompt.includes('the fixed text of `msg` is only the reserve'));
  for (const needle of [
    '- path: _102047_/l2/controleEstoque/web/desktop/page11/produtos.ts',
    '- tag: controle-estoque--web--desktop--page11--produtos-102047',
    '- class: ControleEstoqueDesktopPage11ProdutosPage extends ControleEstoqueProdutosShared',
    '- shared import: /_102047_/l2/controleEstoque/web/shared/produtos.js',
    '- locales (default first): pt-br',
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

test('the reference page is approved, compiled and reused; only a data change regenerates it (22/10)', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const receipt = await approveM4Page(context, pageRef.source, 1, port);
  assert.equal(receipt.sourcePath, 'l2/controleEstoque/web/desktop/page11/produtos.ts');
  assert.ok(port.compiled.includes('102047/l2/controleEstoque/web/desktop/page11/produtos.ts'));
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true);
  assert.equal(await reusableM4Page(identity, 'produtos', 'mobile', port), false, 'mobile was never generated');
  port.files.set('102020/l4/collabux/templates/inventoryControl/page21.md', `${port.files.get('102020/l4/collabux/templates/inventoryControl/page21.md')}\nnew behavior rule\n`);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true, 'a template change regenerates nothing');
  port.files.set('102020/l2/agentMaterializeL2/steps/pages50/prompt.md', `${port.files.get('102020/l2/agentMaterializeL2/steps/pages50/prompt.md')}\nnew rule\n`);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true, 'a prompt change regenerates nothing');
  const declaration = '102047/l2/controleEstoque/web/shared/produtosDts.txt';
  assert.ok(port.files.has(declaration));
  port.files.set(declaration, `${port.files.get(declaration)}\nexport type Extra = string;\n`);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true, 'a page .ts that exists is kept');
});

test('an existing page is reused when its receipt matches, kept when it still compiles, or returned for repair', async () => {
  const port = await studio();
  const pageKey = '102047/l2/controleEstoque/web/desktop/page11/produtos.ts';
  const receiptInfo = pageReceiptInfo(identity, 'produtos', 'desktop');
  await assert.rejects(m4CheckExistingPage(identity, 'produtos', 'desktop', 'page11', port, await port.readJson(receiptInfo) as never), /M4_PAGE_MISSING:/u);
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  await approveM4Page(context, pageRef.source, 1, port);
  const snapshot = await port.readJson<M4InputSnapshot>({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentMaterializeL2`, shortName: 'input', extension: '.json' });
  if (!snapshot) throw new Error('input snapshot missing');
  const compiled = port.compiled.length;
  assert.equal(await m4PageCurrent(identity, 'produtos', 'desktop', 'page11', port, snapshot), true);
  assert.deepEqual(await m4CheckExistingPage(identity, 'produtos', 'desktop', 'page11', port, snapshot), { verdict: 'reused' });
  assert.equal(port.compiled.length, compiled, 'a current page is not compiled again');

  const disk = `${port.files.get(pageKey)}\n// still the page\n`;
  port.files.set(pageKey, disk);
  const receipt = JSON.parse(port.files.get(key(receiptInfo))!);
  port.files.set(key(receiptInfo), JSON.stringify({ ...receipt, dataHash: 'sha256:stale', attempt: 2, design: { concept: 'grid', views: [], decisions: 'keep the grid' } }));
  assert.equal(await m4PageCurrent(identity, 'produtos', 'desktop', 'page11', port, snapshot), false);
  const kept = await m4CheckExistingPage(identity, 'produtos', 'desktop', 'page11', port, snapshot);
  assert.equal(kept.verdict, 'kept');
  assert.equal(JSON.parse(port.files.get(key(receiptInfo))!).dataHash, context.dataHash, 'kept rewrites the receipt');
  assert.equal(await m4PageCurrent(identity, 'produtos', 'desktop', 'page11', port, snapshot), true);

  port.files.delete(key(receiptInfo));
  const withoutReceipt = await m4CheckExistingPage(identity, 'produtos', 'desktop', 'page11', port, snapshot);
  assert.equal(withoutReceipt.verdict, 'kept', 'files without a receipt are still checked');
  assert.equal(port.files.has(key(receiptInfo)), true);

  const failing = await studio(["line 3:5 - TS2339 - Property 'x' does not exist."]);
  const broken = `${pageRef.source}\n// on disk\n`;
  failing.files.set(pageKey, broken);
  const failingSnapshot = await failing.readJson<M4InputSnapshot>({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentMaterializeL2`, shortName: 'input', extension: '.json' });
  if (!failingSnapshot) throw new Error('input snapshot missing');
  await failing.writeJson(receiptInfo, { fingerprint: M4_REUSE_FINGERPRINT, dataHash: 'sha256:old', attempt: 3, design: { concept: 'from the receipt', views: [], decisions: '' } });
  const repair = await m4CheckExistingPage(identity, 'produtos', 'desktop', 'page11', failing, failingSnapshot);
  assert.equal(repair.verdict, 'repair');
  assert.equal(repair.previous, broken);
  assert.match(repair.diagnostic ?? '', /M4_PAGE_COMPILE:\nline 3:5/u);
  assert.equal(repair.design?.concept, 'from the receipt');
  assert.equal(failing.files.get(pageKey), broken, 'a refused check leaves the disk file');
  assert.equal(JSON.parse(failing.files.get(key(receiptInfo))!).dataHash, 'sha256:old', 'a repair does not rewrite the receipt');

  failing.compile = async info => {
    if (info.folder.endsWith('/web/shared')) return { errors: [], declaration: pageRef.sharedDeclaration };
    return { errors: ['Studio TypeScript compiler is unavailable'], declaration: null };
  };
  await assert.rejects(m4CheckExistingPage(identity, 'produtos', 'desktop', 'page11', failing, failingSnapshot), /Studio TypeScript compiler is unavailable/u);
  assert.equal(failing.files.get(pageKey), broken, 'an environment failure restores the disk file');
});

test('a page is skipped when its .ts exists; the page11 defs and the receipt do not decide', async () => {
  const port = await studio();
  assert.equal(port.files.has('102047/l2/controleEstoque/web/desktop/page11/produtos.defs.ts'), true);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), false, 'the defs file is not the page');
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  await approveM4Page(context, pageRef.source, 1, port);
  const receiptKey = '102047/l2/controleEstoque/pipeline/agentMaterializeL2/pages50/produtosDesktop.json';
  const receipt = JSON.parse(port.files.get(receiptKey)!);
  port.files.set(receiptKey, JSON.stringify({ ...receipt, sourceHash: 'sha256:other', dataHash: 'sha256:other' }));
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true, 'a receipt with a different hash does not decide');
  assert.equal(JSON.parse(port.files.get(receiptKey)!).sourceHash, 'sha256:other', 'reuse does not rewrite the receipt');
  port.files.delete(receiptKey);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true, 'no receipt');
  port.files.set('102047/l2/controleEstoque/web/desktop/page11/produtos.ts', `${pageRef.source}\n// edited by hand\n`);
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), true, 'an existing file is kept');
  port.files.delete('102047/l2/controleEstoque/web/desktop/page11/produtos.ts');
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', port), false);
});

test('approving the page11 page deletes its review receipt', async () => {
  const port = await studio();
  const reviewKey = key(reviewReceiptInfo(identity, 'produtos', 'desktop'));
  port.files.set(reviewKey, JSON.stringify({ schemaVersion: 'kept', summary: 'old' }));
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  await approveM4Page(context, pageRef.source, 1, port);
  assert.equal(port.files.has(reviewKey), false, 'the page generated in this run is reviewed again');
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
  for (const needle of ['# Errors', 'TS2339', '# Refused file', '"concept": "grid and panel"', '# Shared declaration', 'export declare class ControleEstoqueProdutosShared', '- locales (every one needs every key): pt-br', '# Row types', 'export interface ProdutoLoad {']) {
    assert.ok(humanPrompt.includes(needle), needle);
  }
  assert.match(systemPrompt, /^<!-- modelType: code -->/u);
});

test('the platform types the contract uses carry the meaning of each field, read from the 102034 ontology (d2_125)', async () => {
  const ontology = real('mls-102034/l1/mdm/defs/ontology.ts');
  const ports = (files: Record<string, string>) => ({ exists: (info: Ns5FileInfo) => key(info) in files, read: async (info: Ns5FileInfo) => files[key(info)] });
  const port = ports({ '102034/l1/mdm/defs/ontology.ts': ontology });
  const section = await m4PlatformTypes(real('mls-102056/l2/onboarding/web/contracts/company_setup.defs.ts'), port);
  assert.match(section, /line1: \{[^}]*street and number/u);
  assert.match(section, /line2: \{[^}]*apartment, suite, floor/u);
  assert.match(section, /line3: \{[^}]*neighborhood, district/u);
  assert.match(section, /Brazil: line1="Rua das Flores 100", line2="Apto 42", line3="Jardim Paulista"/u);
  assert.match(section, /export const ContactSummary = \{/u);
  assert.doesNotMatch(section, /export const (?:PrivacyConsent|MdmEntity) = /u, 'only the types the contract declares');
  await assert.rejects(m4PlatformTypes('export interface Address {}', ports({})), /M4_PAGE_ONTOLOGY_MISSING: .*ontology/u);
  // control: a page whose contract uses no platform type gets no section
  const studioPort = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', studioPort);
  assert.equal(context.platformTypes, '');
  assert.ok(!context.humanPrompt.includes('# Platform types'));
  const repair = await buildM4PageRepairPrompt({ ...context, platformTypes: section }, { diagnostic: 'x', previous: 'y' }, studioPort);
  assert.ok(repair.humanPrompt.includes('# Platform types') && repair.humanPrompt.includes('street and number'), 'the repair repeats the section');
});

test('a page waits until the shared .ts and Dts.txt both exist', async () => {
  const port = await studio();
  port.files.delete('102047/l2/controleEstoque/pipeline/agentMaterializeL2/shared40/produtos.json');
  await buildM4PageContext(identity, 'produtos', 'desktop', port);
  port.files.delete('102047/l2/controleEstoque/web/shared/produtos.ts');
  await assert.rejects(buildM4PageContext(identity, 'produtos', 'desktop', port), /M4_PAGE_SHARED_NOT_READY: the shared of produtos is not reusable \(l2\/controleEstoque\/web\/shared\/produtos\.ts does not exist\)/u);
});

test('a molecule tag with the project suffix is rewritten to the indexed tag, and its import, and recorded', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const source = `${pageRef.source
    .replace("import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';", "import '/_102040_/l2/molecules/groupentertext/ml-enter-text-102040.js';")
    .replaceAll('groupentertext--ml-enter-text', 'groupentertext--ml-enter-text-102040')}\nimport '/_102040_/l2/molecules/groupentertext/ml-not-listed-999.js';\n`;
  const receipt = await approveM4Page(context, source, 1, port);
  const written = port.files.get('102047/l2/controleEstoque/web/desktop/page11/produtos.ts') ?? '';
  assert.equal(written.includes('groupentertext--ml-enter-text-102040'), false);
  assert.equal(written.includes("import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';"), true);
  assert.equal(written.includes('ml-enter-text-102040'), false);
  assert.equal(written.includes('ml-not-listed-999'), true);
  assert.deepEqual(receipt.advisories.filter(item => item.code === 'M4_PAGE_MOLECULE_SUFFIX').map(item => item.message), ['groupentertext--ml-enter-text-102040 -> groupentertext--ml-enter-text']);
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
  assert.equal(failing.files.has('102047/l2/controleEstoque/pipeline/agentMaterializeL2/pages50/produtosDesktop.json'), false, 'a compile error leaves no receipt');
  assert.equal(failing.files.has('102047/l2/controleEstoque/web/desktop/page11/produtos.ts'), false, 'a compile error removes the new file');
  assert.equal(await reusableM4Page(identity, 'produtos', 'desktop', failing), false);
  const prior = `${pageRef.source}\n// previous\n`;
  failing.files.set('102047/l2/controleEstoque/web/desktop/page11/produtos.ts', prior);
  await assert.rejects(approveM4Page(await buildM4PageContext(identity, 'produtos', 'desktop', failing), pageRef.source, 1, failing), /M4_PAGE_COMPILE:\nline 3:5/u);
  assert.equal(failing.files.get('102047/l2/controleEstoque/web/desktop/page11/produtos.ts'), prior, 'a compile error restores the previous file');
  failing.compile = async () => { throw new Error('compiler crashed'); };
  await assert.rejects(approveM4Page(await buildM4PageContext(identity, 'produtos', 'desktop', failing), pageRef.source, 1, failing), /compiler crashed/u);
  assert.equal(failing.files.get('102047/l2/controleEstoque/web/desktop/page11/produtos.ts'), prior, 'a compile throw restores the previous file');
  assert.equal(m4PageEnvironmentFailure('M4_PAGE_COMPILE:\nStudio imports unavailable: _102040_/l2/molecules/x.ts'), true);
  assert.equal(m4PageEnvironmentFailure('M4_PAGE_COMPILE:\nline 1:1 - TS2339 - x'), false);
});

test('a repair with the page file present calls the model', async () => {
  const port = await studio();
  port.files.set('102047/l2/controleEstoque/web/desktop/page11/produtos.ts', pageRef.source);
  const saved = { ...studioPagePort };
  Object.assign(studioPagePort, port);
  try {
    const agent = createPageAgent();
    const ctx = { message: { orderAt: '1', threadId: 't' }, task: { PK: 'task' } } as mls.msg.ExecutionContext;
    const parent = { stepId: 1 } as mls.msg.AIAgentStep;
    const repair = JSON.stringify({ project: identity.project, module: identity.module, pageId: 'produtos', device: 'desktop', attempt: 2, diagnostic: 'TS2339', previous: pageRef.source });
    const intents = await agent.beforePromptStep!({} as never, ctx, parent, { prompt: repair, stepId: 2 } as mls.msg.AIAgentStep, 1);
    assert.equal(intents[0]?.type, 'prompt_ready');
  } finally {
    Object.assign(studioPagePort, saved);
  }
});

test('a Studio edit history reaches the prompt in its own section, is left out of the page definition, and the receipt reports it', async () => {
  // TASK-102020-defs-edit-history (28/10/2026).
  const port = await studio();
  const defs = '102047/l2/controleEstoque/web/desktop/page11/produtos.defs.ts';
  const page11 = parseL2Page11(port.files.get(defs)!).definition;
  const organism = Object.keys(page11.organisms)[0];
  const at = '2026-10-28T00:00:00Z';
  const kept: DefsHistoryEntry = { kind: 'class', organism, target: 'div>button#1', at, from: 'px-3', to: 'px-4 rounded-full', attribute: 'class' };
  const unknown: DefsHistoryEntry = { kind: 'molecule', organism, target: 'groupviewtable--ml-data-table', at, from: 'groupviewtable--ml-data-table', to: 'groupviewtable--ml-nao-existe', scope: 'one' };
  port.files.set(defs, withDefsHistory(port.files.get(defs)!, [kept, unknown]));
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const { humanPrompt } = buildM4PagePrompt(context);
  assert.ok(humanPrompt.includes('# User edits to keep — Studio history of this page (oldest change first)'));
  assert.ok(humanPrompt.includes('"to": "px-4 rounded-full"'));
  assert.ok(!humanPrompt.includes('export const history'), 'the page definition is shown without the history export');
  assert.ok(!humanPrompt.includes('ml-nao-existe'), 'an entry dropped by the catalog is not sent');
  assert.deepEqual(context.target.history, [kept]);
  assert.deepEqual(context.history, { given: 1, dropped: [{ entry: `molecule ${organism}/groupviewtable--ml-data-table`, reason: 'molecule groupviewtable--ml-nao-existe is not in the catalog' }] });
  const receipt = await approveM4Page(context, pageRef.source, 1, port);
  assert.deepEqual(receipt.history, context.history);
});

test('the missing-record title in the real prompt is only for client.preconditionMissing', () => {
  const prompt = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
  assert.match(prompt, /its error is `client\.preconditionMissing`\), say in words what is missing and offer a way back/u);
  assert.match(prompt, /The title of that missing-record state is used only for that error code; any other opening error uses a neutral title, never the missing-record one\./u);
});

test('a page that reads an outside system gets its title, setting titles and the monitor link; one that does not gets nothing', async () => {
  const root = new URL('./fixtures/repoHost/', import.meta.url);
  const fix = (path: string) => readFileSync(new URL(path, root), 'utf8');
  const repoHost = { project: 102047, module: 'repoHost' };
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const pages = ['conteudo_repositorio', 'avisos_mudanca'] as const;
  const hashes: Record<string, string> = {};
  for (const pageId of pages) {
    const desktop = fix(`web/desktop/page11/${pageId}.defs.ts`);
    hashes[pageId] = await sha256Text(defsWithoutHistory(desktop));
    put({ project: repoHost.project, level: 2, folder: `${repoHost.module}/web/desktop/page11`, shortName: pageId, extension: '.defs.ts' }, desktop);
    put({ project: repoHost.project, level: 2, folder: `${repoHost.module}/web/contracts`, shortName: pageId, extension: '.defs.ts' }, fix(`web/contracts/${pageId}.defs.ts`));
    put({ project: repoHost.project, level: 2, folder: `${repoHost.module}/web/shared`, shortName: pageId, extension: '.defs.ts' }, fix(`web/shared/${pageId}.defs.ts`));
    put({ project: repoHost.project, level: 2, folder: `${repoHost.module}/web/shared`, shortName: pageId, extension: '.ts' }, 'export class Shared {}\n');
    put({ project: repoHost.project, level: 2, folder: `${repoHost.module}/web/shared`, shortName: `${pageId}Dts`, extension: '.txt' }, 'export declare class Shared {}\n');
  }
  put({ project: repoHost.project, level: 4, folder: repoHost.module, shortName: 'integration', extension: '.defs.ts' }, fix('integration.defs.ts'));
  put({ project: repoHost.project, level: 4, folder: `${repoHost.module}/pool/l2/web`, shortName: 'backend', extension: '.json' }, fix('pool/l2/web/backend.json'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'prompt', extension: '.md' }, readFileSync(new URL('./prompt.md', import.meta.url), 'utf8'));
  put({ project: 102034, level: 1, folder: 'mdm/defs', shortName: 'ontology', extension: '.ts' }, 'export const Address = {} as const;\n');
  const groups = new Set([...pages.flatMap(pageId => [...fix(`web/desktop/page11/${pageId}.defs.ts`).matchAll(/"(?:preferred|alternative)": "([^"]+)"/gu)].map(match => match[1].split('--')[0]))]);
  for (const group of groups) {
    put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: 'index', extension: '.defs.ts' }, 'export const index = {};\n');
  }
  const port: M4PagePort = {
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    exists: info => files.has(key(info)),
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async () => { throw new Error('not used'); },
    writeJson: async () => { throw new Error('not used'); },
    deleteText: async () => { throw new Error('not used'); },
    declarations: async () => [],
    listDefs: () => [],
    compile: async () => ({ errors: [], declaration: null }),
  };
  const snapshotPage = (pageId: string): M4InputPage => ({
    pageId, status: 'accepted', problems: [], methods: {}, l4: null,
    inputs: { contract: null, shared: null, mobile: null, desktop: { path: pageId, sha256: hashes[pageId] } },
    units: [{ unitId: `${pageId}__desktop`, kind: 'desktop', inputHash: 'unit' }],
  });
  const snapshot: M4InputSnapshot = {
    schemaVersion: '2026-10-14-materialize-l2-input-v4', project: repoHost.project, module: repoHost.module,
    defsPipelineStatus: 'complete', snapshotHash: 'fixture', accepted: [...pages], refused: [], moduleProblems: [],
    pages: pages.map(snapshotPage),
  };
  const content = await buildM4PageContext(repoHost, 'conteudo_repositorio', 'desktop', port, snapshot);
  assert.match(content.prompt, /code: 'disabled'/);
  assert.match(content.humanPrompt, /# Systems outside this page/);
  assert.match(content.humanPrompt, /- GitHub; link: \/monitor\/external-systems\?module=repoHost; settings: repositorio → Repositório; chaveAcesso → Chave de acesso; segredoAviso → Segredo dos avisos/);
  const notices = await buildM4PageContext(repoHost, 'avisos_mudanca', 'desktop', port, snapshot);
  assert.equal(notices.humanPrompt.includes('# Systems outside this page'), false);
});

test('a page that calls a connection lists the catalogue operation and the refused state; a page whose steps call none does not', async () => {
  const root = new URL('./fixtures/connectionCalls/', import.meta.url);
  const fix = (path: string) => readFileSync(new URL(path, root), 'utf8');
  const agents = { project: 102047, module: 'agents' };
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const pages = ['agent_simulation', 'person_restrictions'] as const;
  const hashes: Record<string, string> = {};
  for (const pageId of pages) {
    const desktop = fix(`web/desktop/page11/${pageId}.defs.ts`);
    hashes[pageId] = await sha256Text(defsWithoutHistory(desktop));
    put({ project: agents.project, level: 2, folder: `${agents.module}/web/desktop/page11`, shortName: pageId, extension: '.defs.ts' }, desktop);
    put({ project: agents.project, level: 2, folder: `${agents.module}/web/contracts`, shortName: pageId, extension: '.defs.ts' }, fix(`web/contracts/${pageId}.defs.ts`));
    put({ project: agents.project, level: 2, folder: `${agents.module}/web/shared`, shortName: pageId, extension: '.defs.ts' }, fix(`web/shared/${pageId}.defs.ts`));
    put({ project: agents.project, level: 2, folder: `${agents.module}/web/shared`, shortName: pageId, extension: '.ts' }, fix(`web/shared/${pageId}.ts`));
    put({ project: agents.project, level: 2, folder: `${agents.module}/web/shared`, shortName: `${pageId}Dts`, extension: '.txt' }, fix(`web/shared/${pageId}Dts.txt`));
  }
  put({ project: agents.project, level: 4, folder: agents.module, shortName: 'integration', extension: '.defs.ts' }, fix('l4/integration.defs.ts'));
  put({ project: 102034, level: 2, folder: 'shared/contracts/connections', shortName: 'cm', extension: '.ts' }, fix('cm.ts'));
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'prompt', extension: '.md' }, readFileSync(new URL('./prompt.md', import.meta.url), 'utf8'));
  put({ project: 102034, level: 1, folder: 'mdm/defs', shortName: 'ontology', extension: '.ts' }, 'export const Address = {} as const;\n');
  const groups = new Set([...pages.flatMap(pageId => [...fix(`web/desktop/page11/${pageId}.defs.ts`).matchAll(/"(?:preferred|alternative)": "([^"]+)"/gu)].map(match => match[1].split('--')[0]))]);
  for (const group of groups) {
    put({ project: 102040, level: 2, folder: `molecules/${group}`, shortName: 'index', extension: '.defs.ts' }, 'export const index = {};\n');
  }
  const port: M4PagePort = {
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    exists: info => files.has(key(info)),
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async () => { throw new Error('not used'); },
    writeJson: async () => { throw new Error('not used'); },
    deleteText: async () => { throw new Error('not used'); },
    declarations: async () => [],
    listDefs: () => [],
    compile: async () => ({ errors: [], declaration: null }),
  };
  const snapshotPage = (pageId: string): M4InputPage => ({
    pageId, status: 'accepted', problems: [], methods: {}, l4: null,
    inputs: { contract: null, shared: null, mobile: null, desktop: { path: pageId, sha256: hashes[pageId] } },
    units: [{ unitId: `${pageId}__desktop`, kind: 'desktop', inputHash: 'unit' }],
  });
  const snapshot: M4InputSnapshot = {
    schemaVersion: '2026-10-14-materialize-l2-input-v4', project: agents.project, module: agents.module,
    defsPipelineStatus: 'complete', snapshotHash: 'fixture', accepted: [...pages], refused: [], moduleProblems: [],
    pages: pages.map(snapshotPage),
  };
  const simulation = await buildM4PageContext(agents, 'agent_simulation', 'desktop', port, snapshot);
  assert.match(simulation.prompt, /code: 'refused'/);
  assert.match(simulation.prompt, /never the raw message, never "could not open"/);
  const section = simulation.humanPrompt.slice(simulation.humanPrompt.indexOf('# Connections this page calls'), simulation.humanPrompt.indexOf('# Template'));
  assert.equal(section.includes('cm.listAgents'), false);
  assert.match(section, /- cm\.simulateAgent: Simulate an agent at the levels what it can and what it understands; nothing is saved\. A person the cm holds no current roles for \(they have not used the assistant, or not recently\) answers the error refused; every other failure is invalid or not_found\./);
  assert.ok(section.includes(M4_CONNECTION_REFUSED_LINE));
  assert.deepEqual(simulation.target.refusingConnections, ['cm.simulateAgent']);
  const restrictions = await buildM4PageContext(agents, 'person_restrictions', 'desktop', port, snapshot);
  assert.equal(restrictions.humanPrompt.includes('# Connections this page calls'), false);
  assert.equal(restrictions.target.refusingConnections, undefined);
});

test('agents only forwards the simulate steps, so its section does not list simulateAgent', () => {
  const repo = '/Volumes/WagnerSSD1/collab/mls-base/mls-102047';
  const shared = execFileSync('git', ['-C', repo, 'show', '9e8b640a:l2/agents/web/shared/agents.defs.ts'], { encoding: 'utf8' });
  const integration = readFileSync(new URL('./fixtures/connectionCalls/l4/integration.defs.ts', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('./fixtures/connectionCalls/cm.ts', import.meta.url), 'utf8');
  const steps = m4ServedJourneySteps(parseL2Shared(shared).definition.journeys);
  const section = m4ConnectionCallsSection('agents', steps, integration, new Map([['cm', catalog]]));
  assert.equal(section.some(line => line.includes('simulateAgent')), false);
  assert.match(section.join('\n'), /- cm\.listAgents: /);
});

// Saved from git objects, not the live trees. mls-102047@9e8b640a; mls-102039@812e46e; mls-102056@4c0b77f.
const savedPage = (name: string) => readFileSync(new URL(`./fixtures/i18nPosition/${name}`, import.meta.url), 'utf8');
const catalogue = (text: string) => {
  const start = text.indexOf('/// **collab_i18n_start**');
  const end = text.indexOf('/// **collab_i18n_end**');
  const blockEnd = text.indexOf('\n', end) + 1;
  return { block: text.slice(start, blockEnd), rest: text.slice(0, start) + text.slice(blockEnd) };
};
const codeLines = (text: string) => text.split('\n').filter(line => line.length > 0).join('\n');

test('the catalogue block moves before the class; a block already there is unchanged', () => {
  const desktop = savedPage('agent_behavior.desktop.txt');
  const moved = m4MoveI18nBeforeClass(desktop);
  const before = catalogue(desktop);
  const after = catalogue(moved);
  assert.equal(after.block, before.block);
  assert.equal(codeLines(after.rest), codeLines(before.rest));
  assert.match(moved, /\n\n\/\/\/ \*\*collab_i18n_start\*\*[\s\S]*\/\/\/ \*\*collab_i18n_end\*\*\n\n@customElement\(/u);
  assert.ok(moved.indexOf('/// **collab_i18n_start**') < moved.indexOf('@customElement'));
  const agenda = savedPage('agenda_diaria.mobile.txt');
  const agendaMoved = m4MoveI18nBeforeClass(agenda);
  assert.equal(catalogue(agendaMoved).block, catalogue(agenda).block);
  assert.equal(codeLines(catalogue(agendaMoved).rest), codeLines(catalogue(agenda).rest));
  assert.ok(agendaMoved.indexOf('/// **collab_i18n_start**') < agendaMoved.indexOf('@customElement'));
  assert.equal(m4MoveI18nBeforeClass(savedPage('agent_behavior.mobile.txt')), savedPage('agent_behavior.mobile.txt'));
  assert.equal(m4MoveI18nBeforeClass(savedPage('atendenteCatalogue.desktop.txt')), savedPage('atendenteCatalogue.desktop.txt'));
  const foreign = desktop.replace('const pageMessage_en = {', 'const helper = 1;\nconst pageMessage_en = {');
  assert.equal(m4MoveI18nBeforeClass(foreign), foreign);
  const indented = desktop.replace('/// **collab_i18n_start**', ' /// **collab_i18n_start**');
  assert.equal(m4MoveI18nBeforeClass(indented), indented);
});

test('approval records the move, and the saved pages of 102047, 102039 and 102056 are in place afterwards', async () => {
  const port = await studio();
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const start = pageRef.source.indexOf('/// **collab_i18n_start**');
  const end = pageRef.source.indexOf('/// **collab_i18n_end**');
  const blockEnd = pageRef.source.indexOf('\n', end) + 1;
  const block = pageRef.source.slice(start, blockEnd);
  const parked = `${pageRef.source.slice(0, start)}${pageRef.source.slice(blockEnd).replace(/\n*$/u, '\n')}\n${block}`;
  const receipt = await approveM4Page(context, parked, 1, port);
  assert.deepEqual(receipt.advisories.filter(item => item.code === 'M4_PAGE_I18N_MOVED').map(item => item.message), ['the catalogue block moved before the page class']);
  const written = port.files.get('102047/l2/controleEstoque/web/desktop/page11/produtos.ts') ?? '';
  assert.ok(written.indexOf('/// **collab_i18n_start**') < written.indexOf('@customElement'));
  const unchanged = await approveM4Page(context, pageRef.source, 1, port);
  assert.equal(unchanged.advisories.some(item => item.code === 'M4_PAGE_I18N_MOVED'), false);

  const position = 'the catalogue block must come before the page class (@customElement)';
  const benches = [
    ['/Volumes/WagnerSSD1/collab/mls-base/mls-102047', '9e8b640a'],
    ['/Volumes/WagnerSSD1/collab/mls-base/mls-102039', '812e46e'],
    ['/Volumes/WagnerSSD1/collab/mls-base/mls-102056', '4c0b77f5ce4e0d94642a83492243f6e2d3a08f34'],
  ] as const;
  let refused = 0;
  let accepted = 0;
  for (const [repo, rev] of benches) {
    const files = execFileSync('git', ['-C', repo, 'ls-tree', '-r', '--name-only', rev], { encoding: 'utf8' }).split('\n').filter(path => /\/web\/.*\/page11\/[^/]+\.ts$/u.test(path) && !path.endsWith('.defs.ts'));
    for (const path of files) {
      const source = execFileSync('git', ['-C', repo, 'show', `${rev}:${path}`], { encoding: 'utf8' });
      if (!source.includes('/// **collab_i18n_start**')) continue;
      const classAt = /^(?:@customElement|export class)/mu.exec(source)?.index ?? -1;
      const wasAfter = classAt >= 0 && source.indexOf('/// **collab_i18n_start**') > classAt;
      const placed = m4MoveI18nBeforeClass(source);
      if (wasAfter) {
        refused += 1;
        assert.notEqual(placed, source, path);
        assert.ok(gateM4PageSource(source, context.target).some(item => item.message === position), path);
      } else accepted += 1;
      assert.equal(gateM4PageSource(placed, context.target).some(item => item.message === position), false, path);
    }
  }
  assert.equal(refused, 2);
  assert.ok(accepted >= 84);
});

test('the page prompt shows what each route returns, under the Output type the declaration names (d2_208)', async () => {
  const agentsContract = readFileSync(new URL('./fixtures/d2_208/agents.defs.ts', import.meta.url), 'utf8');
  const outputs = m4RouteOutputs(agentsContract);
  const shape = 'agents: { items: AgentsCollectionEntry[]; page: number; pageSize: number; hasMore: boolean }';
  const routeLine = "// Output<'agents.agents.loadAgentsPage'> (qry)";
  assert.ok(outputs.includes(`${routeLine}\n{ inbox: DraftInboxItem[]; ${shape};`), 'the load route output is copied as written');
  const empty = `/// <mls fileReference="_102047_/l2/controleEstoque/web/contracts/produtos.defs.ts" enhancement="_blank"/>\n\nexport {};\n`;
  assert.equal(m4RouteOutputs(empty), '');

  const port = await studio();
  const contractKey = key({ project: identity.project, level: 2, folder: `${identity.module}/web/contracts`, shortName: 'produtos', extension: '.defs.ts' });
  port.files.set(contractKey, agentsContract);
  const context = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  const heading = `# Route outputs — web/contracts/produtos.defs.ts (what each request returns; the declaration's Output<…> types are these)`;
  const block = `${heading}\n\`\`\`ts\n${outputs}\n\`\`\``;
  assert.ok(context.humanPrompt.includes(block), 'the generation prompt carries the route outputs after the row types');
  assert.ok(context.humanPrompt.indexOf('# Row types') < context.humanPrompt.indexOf(heading));
  const repair = await buildM4PageRepairPrompt(context, { diagnostic: 'x', previous: 'y' }, port);
  const repairHeading = heading.replace('produtos.defs.ts', `${context.pageId}.defs.ts`);
  assert.ok(repair.humanPrompt.includes(repairHeading) && repair.humanPrompt.includes(routeLine) && repair.humanPrompt.includes(shape), 'the repair prompt carries the same outputs');

  port.files.set(contractKey, empty);
  const bare = await buildM4PageContext(identity, 'produtos', 'desktop', port);
  assert.equal(bare.routeOutputs, '');
  assert.ok(!bare.humanPrompt.includes('# Route outputs'), 'a contract with no route adds no section');
  const bareRepair = await buildM4PageRepairPrompt(bare, { diagnostic: 'x', previous: 'y' }, port);
  assert.ok(!bareRepair.humanPrompt.includes('# Route outputs'));
});
