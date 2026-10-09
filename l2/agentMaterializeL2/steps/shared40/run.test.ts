/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import {
  M4_SHARED_RUNTIME_REFS, approveM4Shared, buildM4SharedContext, buildM4SharedPrompt, buildM4SharedRepairPrompt, m4AddedMemberFindings, m4SharedEnvironmentFailure, m4SharedReuseBlocker, mergeM4Findings, m4SharedToolFindings, m4SharedToolSchema, m4SharedToolSource, recordM4SharedAttempt, reusableM4Shared, type M4SharedPort,
} from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';

interface Fixture {
  project: number; module: string; defsPipelineStatus: string; knownMolecules: string[]; knownTemplates: string[];
  pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }>;
}
const fixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;
const reference = (JSON.parse(readFileSync(new URL('./fixtures/produtosShared.json', import.meta.url), 'utf8')) as { source: string }).source;
const promptText = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
const repairText = readFileSync(new URL('./promptRepair.md', import.meta.url), 'utf8');
const identity = { project: fixture.project, module: fixture.module };
const key = (info: Ns5FileInfo) => `${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;
const DECLARATION = 'export declare class ControleEstoqueProdutosShared {}\n';

function listIn(files: Map<string, string>, project: number, folder: string, level: number): string[] {
  const prefix = `${project}/l${level}/${folder}/`;
  return [...files.keys()].filter(item => item.startsWith(prefix) && item.endsWith('.defs.ts') && !item.slice(prefix.length).includes('/')).map(item => item.slice(item.lastIndexOf('/') + 1, -'.defs.ts'.length));
}

/** In-memory Studio holding the module defs, the prompt, molecule indexes and template; compile is scripted. */
async function studio(compileErrors: string[] = []) {
  const files = new Map<string, string>();
  const put = (info: Ns5FileInfo, text: string) => files.set(key(info), text);
  const folders = { contract: 'web/contracts', shared: 'web/shared', desktop: 'web/desktop/page11', mobile: 'web/mobile/page11' } as const;
  for (const [pageId, row] of Object.entries(fixture.pages)) {
    for (const [kind, folder] of Object.entries(folders)) put({ project: identity.project, level: 2, folder: `${identity.module}/${folder}`, shortName: pageId, extension: '.defs.ts' }, row[kind as keyof typeof row]);
  }
  put({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pipeline', extension: '.json' }, JSON.stringify({ status: 'complete' }));
  put({ project: 102020, level: 4, folder: 'collabux/templates/inventoryControl', shortName: 'page21', extension: '.md' }, '# template');
  for (const tag of fixture.knownMolecules) {
    const info = { project: 102040, level: 2, folder: `molecules/${tag.split('--')[0]}`, shortName: 'index', extension: '.defs.ts' };
    put(info, `${files.get(key(info)) ?? ''}{ tag: '${tag}' },\n`);
  }
  // The real L4 of the module, as the Studio serves it (level 4): module, rules, access, ontology/, journeys/.
  const l4Root = new URL(`../../../../../mls-102047/l4/${identity.module}/`, import.meta.url);
  for (const sub of ['', 'ontology/', 'journeys/']) {
    const dir = new URL(sub, l4Root);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(item => item.endsWith('.defs.ts'))) {
      put({ project: identity.project, level: 4, folder: `${identity.module}${sub ? `/${sub.slice(0, -1)}` : ''}`, shortName: name.slice(0, -'.defs.ts'.length), extension: '.defs.ts' }, readFileSync(new URL(name, dir), 'utf8'));
    }
  }
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/shared40', shortName: 'prompt', extension: '.md' }, promptText);
  put({ project: 102020, level: 2, folder: 'agentMaterializeL2/steps/shared40', shortName: 'promptRepair', extension: '.md' }, repairText);
  const compiled: string[] = [];
  const declared: string[][] = [];
  const port: M4SharedPort & { files: Map<string, string>; compiled: string[]; declared: string[][] } = {
    files, compiled, declared,
    declarations: async refs => { declared.push([...refs]); return refs.map(ref => ({ ref, declaration: ref.endsWith('stateLitElement.js') ? 'export declare abstract class StateLitElement {}' : `declare module ${ref}` })); },
    read: async info => { const text = files.get(key(info)); if (text === undefined) throw new Error(`file not found: ${key(info)}`); return text; },
    exists: info => files.has(key(info)),
    readJson: async <T>(info: Ns5FileInfo) => { const text = files.get(key(info)); return text === undefined ? null : JSON.parse(text) as T; },
    writeText: async (info, text) => { files.set(key(info), text); },
    writeJson: async (info, value) => { files.set(key(info), JSON.stringify(value)); },
    listDefs: (project, folder, level) => listIn(files, project, folder, level),
    compile: async (info, source) => { compiled.push(key(info)); return compileErrors.length ? { errors: compileErrors, declaration: null } : { errors: [], declaration: source.includes('export class') ? DECLARATION : '' }; },
  };
  await runM4Input(identity, {
    listDefs: (project, folder, level = 2) => listIn(files, project, folder, level),
    exists: port.exists, read: port.read, readJson: port.readJson, write: port.writeJson,
  });
  return port;
}

test('the prompt carries target, contract, shared, organisms, the methods the pages call and the notes', async () => {
  const port = await studio();
  const context = await buildM4SharedContext(identity, 'produtos', port);
  const { systemPrompt, humanPrompt } = await buildM4SharedPrompt(context, port);
  assert.equal(systemPrompt, promptText);
  for (const needle of [
    '- path: _102047_/l2/controleEstoque/web/shared/produtos.ts',
    '- class: ControleEstoqueProdutosShared',
    '- contract import: /_102047_/l2/controleEstoque/web/contracts/produtos.defs.js',
    'export interface ProdutosContracts',
    '"filterListaProdutos"',
    '- alertasSaldoBaixo (highlights):',
    'Intents: abrirMovimentacoes/navigate→movimentacoes',
    '# Methods the pages call',
    '- cadastrarProduto',
    '# Business context (L4)',
    '## Entities (meaning and field titles)',
    '# Notes on the defs',
    '# Runtime declarations (the real types you code against)',
    '## /_102029_/l2/stateLitElement.js',
    'export declare abstract class StateLitElement',
  ]) assert.ok(humanPrompt.includes(needle), needle);
  assert.deepEqual(port.declared[0], M4_SHARED_RUNTIME_REFS);
});

test('a repair is a focused fix (agentFix style): errors, refused file, its import declarations, ids to keep', async () => {
  const port = await studio();
  const context = await buildM4SharedContext(identity, 'produtos', port);
  const diagnostic = "M4_SHARED_COMPILE:\nline 94:37 - TS2540 - Cannot assign to 'childNodes' because it is a read-only property. (and 67 more of the same error at this position)\n    > this[member] = value;";
  const { systemPrompt, humanPrompt } = await buildM4SharedRepairPrompt(context, { diagnostic, previous: reference }, port);
  assert.equal(systemPrompt, repairText);
  assert.ok(!humanPrompt.includes('# Organisms'), 'not the generation prompt again');
  for (const needle of [
    '# Ids to keep',
    '- states: listaProdutos, filtroBuscaProdutos, paginaProdutos, produtoSelecionado, produtoCadastro, produtoCadastrado, movimentacoesProduto, scenary',
    '- functions: load, filterListaProdutos, loadMoreListaProdutos, cadastrarProduto, selecionarProduto, abrirMovimentacoes, setScenario',
    '- routes: controleEstoque.produtos.load, controleEstoque.produtos.cadastrarProduto',
    '# Errors', 'TS2540', '# Refused file', 'export class ControleEstoqueProdutosShared',
    '# Import declarations', '## /_102033_/l2/shared/layout/auraNavigate.js',
    'export interface ProdutosContracts',
  ]) assert.ok(humanPrompt.includes(needle), needle);
  assert.deepEqual(port.declared[0].sort(), [
    '/_102029_/l2/bffClient.js', '/_102029_/l2/collabState.js', '/_102029_/l2/interactionRuntime.js', '/_102029_/l2/stateLitElement.js',
    '/_102033_/l2/shared/layout/auraNavigate.js', '/_102047_/l2/controleEstoque/web/contracts/produtos.defs.js',
  ], 'the imports of the refused file, read from its source');
  assert.match(repairText, /^<!-- modelType: code -->/u);
  assert.match(repairText, /TS2540[\s\S]*keyof <ClassName>/u);
});

test('approval writes the source, compiles it, writes the declaration and a receipt; then the unit is reused', async () => {
  const port = await studio();
  const context = await buildM4SharedContext(identity, 'produtos', port);
  assert.equal(await reusableM4Shared(identity, 'produtos', port), false);
  const receipt = await approveM4Shared(context, reference, 1, port);
  assert.equal(receipt.sourcePath, 'l2/controleEstoque/web/shared/produtos.ts');
  assert.equal(receipt.declarationPath, 'l2/controleEstoque/web/shared/produtosDts.txt');
  assert.deepEqual(port.compiled, ['102047/l2/controleEstoque/web/shared/produtos.ts']);
  assert.equal(port.files.get('102047/l2/controleEstoque/web/shared/produtosDts.txt'), DECLARATION);
  assert.equal(await reusableM4Shared(identity, 'produtos', port), true);

  port.files.set('102047/l2/controleEstoque/web/shared/produtos.ts', `${reference}// edited by hand\n`);
  assert.equal(await reusableM4Shared(identity, 'produtos', port), false, 'a hand edit invalidates the receipt');
});

test('a note change from input20 invalidates the receipt, as a defs change does', async () => {
  const port = await studio();
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  assert.equal(await reusableM4Shared(identity, 'produtos', port), true);
  const path = '102047/l2/controleEstoque/pipeline/agentMaterializeL2/input.json';
  const snapshot = JSON.parse(port.files.get(path)!);
  const produtos = snapshot.pages.find((page: { pageId: string }) => page.pageId === 'produtos');
  produtos.problems = [...produtos.problems, { severity: 'warning', code: 'M4_INPUT_ROUTE_KIND', page: 'produtos', path: 'shared:requests.load', message: 'a new note' }];
  port.files.set(path, JSON.stringify(snapshot));
  assert.equal(await reusableM4Shared(identity, 'produtos', port), false);
});

test('the reuse check says why, and tolerates CRLF and trailing whitespace the Studio may add', async () => {
  const port = await studio();
  assert.match((await m4SharedReuseBlocker(identity, 'produtos', port))!, /^no receipt at l2\/controleEstoque\/pipeline\/agentMaterializeL2\/shared40\/produtos\.json$/u);
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  assert.equal(await m4SharedReuseBlocker(identity, 'produtos', port), null);
  const path = '102047/l2/controleEstoque/web/shared/produtos.ts';
  port.files.set(path, `${port.files.get(path)!.replace(/\n/gu, '\r\n')}\r\n\r\n`);
  assert.equal(await m4SharedReuseBlocker(identity, 'produtos', port), null, 'line endings and trailing blank lines are not a change');
  port.files.set(path, port.files.get(path)!.replace('get saldoAtual()', 'get saldoTotal()'));
  assert.equal(await m4SharedReuseBlocker(identity, 'produtos', port), 'l2/controleEstoque/web/shared/produtos.ts changed after approval');
});

test('a prompt change invalidates the receipt', async () => {
  const port = await studio();
  await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port);
  port.files.set('102020/l2/agentMaterializeL2/steps/shared40/prompt.md', `${promptText}\nextra rule\n`);
  assert.equal(await reusableM4Shared(identity, 'produtos', port), false);
});

test('a gate refusal writes nothing; a compile error leaves no receipt', async () => {
  const port = await studio();
  const context = await buildM4SharedContext(identity, 'produtos', port);
  await assert.rejects(approveM4Shared(context, reference.replace('@property({ attribute: false }) filtroBuscaProdutos', 'filtroBuscaProdutos'), 1, port), /M4_SHARED_GATE:\nM4_SHARED_STATE_MISSING/u);
  assert.equal(port.files.has('102047/l2/controleEstoque/web/shared/produtos.ts'), false);

  const failing = await studio(["produtos.ts(10,1): error TS2304: Cannot find name 'x'."]);
  await assert.rejects(approveM4Shared(await buildM4SharedContext(identity, 'produtos', failing), reference, 1, failing), /M4_SHARED_COMPILE:\n.*TS2304/u);
  assert.equal(await reusableM4Shared(identity, 'produtos', failing), false);
});

test('a refused answer is kept for diagnosis next to the receipts', async () => {
  const port = await studio();
  await recordM4SharedAttempt(identity, 'produtos', 2, 'export class X {}', 'M4_SHARED_GATE:\nM4_SHARED_NAVIGATE: x */ y', port);
  const text = port.files.get('102047/l2/controleEstoque/pipeline/agentMaterializeL2/shared40/produtosAttempt2.txt')!;
  assert.match(text, /^\/\* refused: M4_SHARED_GATE:\nM4_SHARED_NAVIGATE: x \* \/ y \*\/\n\nexport class X \{\}\n$/u);
});

test('a defs change after input20 is refused as stale', async () => {
  const port = await studio();
  const path = '102047/l2/controleEstoque/web/shared/produtos.defs.ts';
  port.files.set(path, port.files.get(path)!.replace('"Carregar produtos"', '"Carregar todos os produtos"'));
  await assert.rejects(buildM4SharedContext(identity, 'produtos', port), /M4_SHARED_INPUT_STALE: produtos shared/u);
});

test('environment compile failures are told apart from code errors (no repair is spent on them)', () => {
  assert.equal(m4SharedEnvironmentFailure('M4_SHARED_COMPILE:\nStudio imports unavailable: _102033_/l2/shared/layout/auraNavigate.ts (fecthQl: Please connect to github!)'), true);
  assert.equal(m4SharedEnvironmentFailure('M4_SHARED_COMPILE:\nStudio TypeScript compiler is unavailable'), true);
  assert.equal(m4SharedEnvironmentFailure("M4_SHARED_COMPILE:\nline 3:5 - TS18047 - 'output' is possibly 'null'."), false);
  assert.equal(m4SharedEnvironmentFailure('M4_SHARED_GATE:\nM4_SHARED_NAVIGATE: x'), false);
});

test('the tool answer is read from object or JSON string arguments', () => {
  assert.equal(m4SharedToolSource({ arguments: { source: 'x' } }), 'x');
  assert.equal(m4SharedToolSource({ type: 'flexible', result: { toolName: 'submitSharedTs', arguments: '{"source":"y"}' } }), 'y');
  assert.throws(() => m4SharedToolSource({ type: 'flexible', result: { toolName: 'other', arguments: {} } }), /M4_SHARED_TOOL_MISMATCH/u);
});

test('findings (V5): the tool requires them, the receipt keeps them, malformed rows are dropped', async () => {
  assert.deepEqual(m4SharedToolSchema.required, ['source', 'findings']);
  const payload = { arguments: JSON.stringify({ source: 'x', findings: [{ code: 'FORM_DRAFT_MISSING', message: 'no input state for formularioProduto; added produtoCadastro' }, { code: 1 }] }) };
  assert.equal(m4SharedToolSource(payload), 'x');
  const findings = m4SharedToolFindings(payload);
  assert.deepEqual(findings.map(item => item.code), ['FORM_DRAFT_MISSING']);
  const port = await studio();
  const receipt = await approveM4Shared(await buildM4SharedContext(identity, 'produtos', port), reference, 1, port, findings);
  assert.deepEqual(receipt.findings, findings);
});

test('findings (V5) from the declaration: every public member the defs do not declare, even when the LLM forgets', async () => {
  const port = await studio();
  const context = await buildM4SharedContext(identity, 'produtos', port);
  const declaration = [
    'export declare class ControleEstoqueProdutosShared extends StateLitElement {',
    '    listaProdutos: ProdutoLoad[];',
    '    filtroBuscaProdutos: string | null;',
    "    loadStatus: 'idle' | 'loading';",
    '    scenary: string;',
    '    novoRascunho: { details: {',
    '        name: string | null;',
    '    } };',
    '    private publish;',
    '    connectedCallback(): void;',
    '    load(): Promise<void>;',
    '    setNovoRascunho(value: unknown): void;',
    '    get detalheProduto(): ProdutoLoad | null;',
    '}',
  ].join('\n');
  const added = m4AddedMemberFindings(declaration, context.target).map(item => item.message.split(' ')[1]);
  assert.deepEqual(added, ['detalheProduto', 'novoRascunho', 'setNovoRascunho']);
  assert.deepEqual(mergeM4Findings([{ code: 'A', message: 'x' }], [{ code: 'A', message: 'x' }, { code: 'B', message: 'y' }]).map(item => item.code), ['A', 'B']);
});
