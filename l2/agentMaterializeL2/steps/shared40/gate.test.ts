/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { gateM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';
import { gateM4SharedSource, m4FillStateJsdoc, m4SharedClassName, m4SharedUiMethods, methodBody, type M4SharedTarget } from '/_102020_/l2/agentMaterializeL2/steps/shared40/gate.js';

interface InputFixture {
  project: number; module: string; defsPipelineStatus: string; knownMolecules: string[]; knownTemplates: string[];
  pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }>;
}
const inputFixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as InputFixture;
// Hand-written reference shared of controleEstoque/produtos, typechecked with tsc against the real contract.
const reference = (JSON.parse(readFileSync(new URL('./fixtures/produtosShared.json', import.meta.url), 'utf8')) as { source: string }).source;

function target(pageId = 'produtos'): M4SharedTarget {
  const gate = gateM4Input({
    project: inputFixture.project, module: inputFixture.module, defsPipelineStatus: inputFixture.defsPipelineStatus,
    pages: Object.entries(inputFixture.pages).map(([id, sources]) => ({ pageId: id, sources })),
    templateExists: () => true, moleculeExists: () => true,
  });
  const parsed = gate.parsed[pageId];
  return {
    project: inputFixture.project, module: inputFixture.module, pageId,
    className: m4SharedClassName(inputFixture.module, pageId),
    shared: parsed.shared, contract: parsed.contract,
    rules: gate.problems.filter(item => item.page === pageId),
  };
}
const codes = (source: string) => gateM4SharedSource(source, target()).map(item => item.code).sort();

test('the reference produtos shared passes the gate with no issue', () => {
  assert.equal(m4SharedClassName('controleEstoque', 'produtos'), 'ControleEstoqueProdutosShared');
  assert.deepEqual(gateM4SharedSource(reference, target()), []);
});

test('a missing state, function or method the pages call is named', () => {
  const noState = reference.replace('@property({ attribute: false }) filtroBuscaProdutos', 'filtroBuscaProdutos');
  assert.deepEqual(codes(noState), ['M4_SHARED_STATE_MISSING']);
  const noFunction = reference.replace('selecionarProduto(produtoId: string | null): void {', 'selectProduto(produtoId: string | null): void {');
  assert.deepEqual(codes(noFunction), ['M4_SHARED_FUNCTION_MISSING']);
  // 05/10/2026: no check by function name; a resolved method (createX → criarX) must exist
  const withMethods = gateM4SharedSource(reference, { ...target(), methods: { createProduto: 'criarProduto' } }).map(item => item.code);
  assert.deepEqual(withMethods, ['M4_SHARED_FUNCTION_MISSING']);
});

test('routes: an unknown route and an uncalled request are refused', () => {
  const unknown = reference.replaceAll("'controleEstoque.produtos.cadastrarProduto'", "'controleEstoque.produtos.criarProduto'");
  assert.deepEqual(codes(unknown), ['M4_SHARED_ROUTE_UNKNOWN', 'M4_SHARED_ROUTE_UNUSED']);
});

test('the Studio answer of 01/10: literal localStorage keys <module>.<pageId>.<param> are not routes', () => {
  const literalKeys = reference.replace("    if (search !== null) this.publish('filtroBuscaProdutos', search);",
    "    try { window.localStorage.getItem('controleEstoque.produtos.search'); window.localStorage.getItem('controleEstoque.produtos.page'); } catch { /* none */ }\n    if (search !== null) this.publish('filtroBuscaProdutos', search);");
  assert.notEqual(literalKeys, reference);
  assert.deepEqual(codes(literalKeys), []);
  const realUnknown = reference.replace("'controleEstoque.produtos.load', this.loadInput(", "'controleEstoque.produtos.listar', this.loadInput(");
  assert.ok(codes(realUnknown).includes('M4_SHARED_ROUTE_UNKNOWN'), 'a real unknown route is still refused');
});

test('imports, rendering, console and user text are refused', () => {
  const extraImport = reference.replace("import { property } from 'lit/decorators.js';", "import { property } from 'lit/decorators.js';\nimport { html } from 'lit';");
  assert.deepEqual(codes(extraImport), ['M4_SHARED_IMPORT']);
  const rendering = reference.replace('  /** setter for the form draft', '  render() { return null; }\n\n  /** setter for the form draft');
  assert.deepEqual(codes(rendering), ['M4_SHARED_FORBIDDEN']);
  const text = reference.replace("{ code: 'client.requiredMissing', message: ''", "{ code: 'client.requiredMissing', message: 'Preencha os campos'");
  assert.deepEqual(codes(text), ['M4_SHARED_TEXT']);
  const logging = reference.replace('    if (!this.listaProdutosHasMore) return;', '    console.log(this.paginaProdutos);\n    if (!this.listaProdutosHasMore) return;');
  assert.deepEqual(codes(logging), ['M4_SHARED_FORBIDDEN']);
});

test('the scene state is always declared, for the pages to decide their scenes', () => {
  assert.deepEqual(codes(reference.replace("  @property({ attribute: false }) scenary = '';\n", '')), ['M4_SHARED_SCENARY']);
  assert.deepEqual(codes(reference.replace('  setScenario(value: string): void {', '  changeScene(value: string): void {')), ['M4_SHARED_SCENARY']);
});

test('the Studio answer of 01/10: a direct dynamic write this[member] = … is refused before compiling', () => {
  const direct = reference.replace('    (this as Record<string, unknown>)[member] = value;', '    this[member] = value;');
  assert.notEqual(direct, reference);
  assert.deepEqual(codes(direct), ['M4_SHARED_DYNAMIC_WRITE']);
});

test('header and class name are exact', () => {
  assert.deepEqual(codes(reference.replace('enhancement="_102020_/l2/enhancementAura"', 'enhancement="_blank"')), ['M4_SHARED_HEADER']);
  assert.deepEqual(codes(reference.replace('export class ControleEstoqueProdutosShared', 'export class ProdutosShared')), ['M4_SHARED_CLASS']);
});

test('navigation must use auraNavigate to the target page with every carry', () => {
  const noCarry = reference.replace('movimentacoes?produtoId=${', 'movimentacoes?id=${');
  assert.deepEqual(codes(noCarry), ['M4_SHARED_NAVIGATE']);
});

test('rules are met through delegation to a private method or a module function (first Studio run, 30/09)', () => {
  const viaMethod = reference
    .replace("    auraNavigate(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`, { basePath: BASE_PATH });",
      "    this.navigateTo(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`);")
    .replace('  private loadInput(', '  private navigateTo(href: string): void {\n    auraNavigate(href, { basePath: BASE_PATH });\n  }\n\n  private loadInput(');
  assert.notEqual(viaMethod, reference);
  assert.deepEqual(codes(viaMethod), []);
  const viaFunction = reference
    .replace("    auraNavigate(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`, { basePath: BASE_PATH });",
      "    goTo('movimentacoes', { produtoId: this.produtoSelecionado });")
    .replace('function emptyProdutoCadastro(', "function goTo(page: string, params: Record<string, string>): void {\n  auraNavigate(`${BASE_PATH}/${page}?${new URLSearchParams(params)}`, { basePath: BASE_PATH });\n}\n\nfunction emptyProdutoCadastro(");
  assert.deepEqual(codes(viaFunction), [], 'a generic helper that receives the page and the carries is fine');
  const viaModuleArrow = reference
    .replace("    auraNavigate(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`, { basePath: BASE_PATH });",
      "    goToPage(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`);")
    .replace('function emptyProdutoCadastro(', "const goToPage = (href: string): void => { auraNavigate(href, { basePath: BASE_PATH }); };\n\nfunction emptyProdutoCadastro(");
  assert.deepEqual(codes(viaModuleArrow), [], 'module arrow with a block body');
  const viaFieldArrow = reference
    .replace("    auraNavigate(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`, { basePath: BASE_PATH });",
      "    void this.go(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`);")
    .replace('  private loadInput(', '  private readonly go = (href: string) => auraNavigate(href, { basePath: BASE_PATH });\n\n  private loadInput(');
  assert.deepEqual(codes(viaFieldArrow), [], 'class field arrow with an expression body');
  const noNavigation = reference.replace("    auraNavigate(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`, { basePath: BASE_PATH });", '');
  assert.ok(codes(noNavigation).includes('M4_SHARED_NAVIGATE'));
});

test('the Studio answer of 01/10: navigation by window.location.assign is refused with the exact fix', () => {
  const viaLocation = reference
    .replace("import { auraNavigate } from '/_102033_/l2/shared/layout/auraNavigate.js';\n", '')
    .replace("    auraNavigate(`${BASE_PATH}/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`, { basePath: BASE_PATH });",
      "    window.location.assign(`/controleEstoque/movimentacoes?produtoId=${encodeURIComponent(this.produtoSelecionado)}`);");
  const issues = gateM4SharedSource(viaLocation, target());
  assert.deepEqual(issues.map(item => item.code).sort(), ['M4_SHARED_LOCATION', 'M4_SHARED_NAVIGATE']);
  assert.match(issues.find(item => item.code === 'M4_SHARED_LOCATION')!.message, /window\.location\.assign\( is refused.*auraNavigate\(href, \{ basePath: '\/controleEstoque' \}\)/u);
  assert.match(issues.find(item => item.code === 'M4_SHARED_NAVIGATE')!.message, /never called in the file: add import \{ auraNavigate \}/u);
  for (const write of ['window.location.href = x;', 'location.replace(x);', 'history.pushState({}, \'\', x);']) {
    assert.ok(codes(reference.replace('    this.publish(\'movimentacoesProduto\', this.produtoSelecionado);', `    this.publish('movimentacoesProduto', this.produtoSelecionado);\n    ${write}`)).includes('M4_SHARED_LOCATION'), write);
  }
  assert.ok(reference.includes('window.location.search'), 'reading the query string stays allowed');
});

test('the Studio answer of 01/10: state JSDoc in a detached block does not reach the .d.ts', () => {
  const detached = reference.replace('  /** state filtroBuscaProdutos — source entry.params.search (filter:listaProdutos, persisted) */\n', '');
  assert.deepEqual(codes(detached), ['M4_SHARED_JSDOC']);
});

test('comments may hold prose; methodBody finds methods and ignores calls', () => {
  assert.ok(methodBody(reference, 'load')?.includes("'controleEstoque.produtos.load'"));
  assert.equal(methodBody(reference, 'naoExiste'), null);
});

test('any and the non-null assertion are refused; handleIcaStateChange keeps its value: any', () => {
  assert.ok(!codes(reference).includes('M4_SHARED_ANY'), 'the reference keeps only handleIcaStateChange(key: string, value: any)');
  const withAny = reference.replace('private loadInput(page: number | null)', 'private loadInput(page: any)');
  assert.ok(codes(withAny).includes('M4_SHARED_ANY'));
  const withBang = reference.replace("this.publish('produtoCadastrado', response.data.produto);", "this.publish('produtoCadastrado', response.data!.produto);");
  assert.notEqual(withBang, reference);
  assert.ok(codes(withBang).includes('M4_SHARED_NON_NULL'));
  assert.ok(!codes(reference).includes('M4_SHARED_NON_NULL'), 'a negation like !response is not an assertion');
});

test('publish must type the value by the member (fechamento 05/10: value: unknown)', () => {
  assert.ok(!codes(reference).includes('M4_SHARED_PUBLISH'));
  const untyped = reference.replace('private publish<M extends keyof this & string>(member: M, value: this[M]): void {', 'private publish<M extends keyof this & string>(member: M, value: unknown): void {');
  assert.notEqual(untyped, reference);
  assert.ok(codes(untyped).includes('M4_SHARED_PUBLISH'));
});

test('a fresh visit: connectedCallback must reset statuses, errors and the scene (06/10)', () => {
  assert.ok(!codes(reference).includes('M4_SHARED_VISIT_RESET'));
  const stale = reference.replace('    this.resetVisit();\n', '');
  assert.notEqual(stale, reference);
  assert.ok(codes(stale).includes('M4_SHARED_VISIT_RESET'));
});

// atendimento, 07/10/2026: the draft held comandaId, nobody filled it, and lancarItem refused itself in the browser.
test('a form input member that is the page selection must be read from its state', () => {
  const item = { form: 'cadastro', method: 'cadastrarProduto', route: 'controleEstoque.produtos.cadastrarProduto', member: 'contextoId', param: 'contextoId' };
  const read = gateM4SharedSource(reference, { ...target(), contextInputs: [{ ...item, state: 'produtoCadastro' }] }).map(issue => issue.code);
  assert.ok(!read.includes('M4_SHARED_CONTEXT_INPUT'), 'cadastrarProduto reads this.produtoCadastro');
  const unread = gateM4SharedSource(reference, { ...target(), contextInputs: [{ ...item, state: 'selectedContexto' }] });
  const issue = unread.find(row => row.code === 'M4_SHARED_CONTEXT_INPUT');
  assert.ok(issue, 'cadastrarProduto never reads this.selectedContexto');
  assert.match(issue.message, /cadastrarProduto must fill the input member contextoId of controleEstoque\.produtos\.cadastrarProduto from this\.selectedContexto/u);
  // a method the gate cannot find is reported by M4_SHARED_FUNCTION_MISSING, not here
  assert.ok(!gateM4SharedSource(reference, { ...target(), contextInputs: [{ ...item, method: 'naoExiste', state: 'selectedContexto' }] }).some(row => row.code === 'M4_SHARED_CONTEXT_INPUT'));
});

// agendaClinica/consultas, 07/10/2026: attempt 1 had every JSDoc, the repair dropped the seven state ones,
// and the page hit the repair limit on M4_SHARED_JSDOC alone. The defs hold the whole text of that line.
test('a state field with no JSDoc gets it back from the defs before the gate; one that has it is untouched', () => {
  assert.equal(m4FillStateJsdoc(reference, target()), reference, 'the reference already has every state JSDoc');
  const states = Object.keys(target().shared.states);
  const stripped = reference.split('\n').filter(line => !/^\s*\/\*\* state /u.test(line) || !states.some(id => line.includes(`/** state ${id} `))).join('\n');
  assert.notEqual(stripped, reference);
  assert.ok(codes(stripped).includes('M4_SHARED_JSDOC'));
  const filled = m4FillStateJsdoc(stripped, target());
  assert.ok(!codes(filled).includes('M4_SHARED_JSDOC'));
  for (const id of states) {
    const state = target().shared.states[id];
    assert.ok(filled.includes(`/** state ${id} — ${state.description.replace(/\s+/gu, ' ').trim()}; source ${state.source} */`), id);
  }
});

test('the filled JSDoc keeps the indentation, lists the organisms and cannot close itself early', () => {
  const base = target();
  const shared = structuredClone(base.shared);
  const [id] = Object.keys(shared.states);
  shared.states[id] = { ...shared.states[id], description: 'Holds */ the\nlist', organisms: ['lista', 'detalhe'] };
  const source = `export class X {\n    @property({ attribute: false }) ${id} = null;\n}\n`;
  assert.equal(m4FillStateJsdoc(source, { shared }).split('\n')[1], `    /** state ${id} — Holds * / the list; source ${shared.states[id].source}; organisms lista, detalhe */`);
  // a field the source does not declare is left to M4_SHARED_STATE_MISSING
  assert.equal(m4FillStateJsdoc('export class X {}\n', { shared }), 'export class X {}\n');
});

// Guilherme, 09/10/2026: "Item lançado" and old errors stayed on screen while the person edited the next item,
// picked another record or changed scene. Changing what a command acts on resets its result.
test('within a visit, every setter, selection and scene change resets the command results', () => {
  assert.deepEqual(m4SharedUiMethods(reference, target().shared), ['selecionarProduto', 'setProdutoCadastro', 'setScenario'], 'public is optional; loads, commands and the lifecycle are left out');
  assert.ok(!codes(reference).includes('M4_SHARED_RESULT_RESET'), 'the reference resets through resetCommandResults()');
  const unreset = reference.replace('  setProdutoCadastro(value: ProdutoCadastroDraft): void {\n    this.resetCommandResults();\n', '  setProdutoCadastro(value: ProdutoCadastroDraft): void {\n');
  assert.notEqual(unreset, reference);
  const issues = gateM4SharedSource(unreset, target()).filter(item => item.code === 'M4_SHARED_RESULT_RESET');
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /^setProdutoCadastro changes what the commands act on .*: cadastrarProdutoStatus, cadastrarProdutoError/u);
  // a private helper is not a page entry point, and a bare call is not a method
  assert.ok(!m4SharedUiMethods('class X {\n  private helper(): void {}\n  run(): void {\n    helper(1);\n  }\n}', { functions: {} }).includes('helper'));
});
