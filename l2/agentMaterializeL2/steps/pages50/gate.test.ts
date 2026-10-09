/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { gateM4PageSource, htmlTemplates, m4BoundEvents, m4MoleculeEvents, m4MoleculeImport, m4PageJourneyFunctions, m4PageClassName, m4PageTag, withoutExpressions, type M4PageTarget } from '/_102020_/l2/agentMaterializeL2/steps/pages50/gate.js';

const input = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as { pages: Record<string, { desktop: string; mobile: string }> };
// Hand-written reference desktop page of controleEstoque/produtos, typechecked with tsc against the reference shared.
const reference = (JSON.parse(readFileSync(new URL('./fixtures/produtosDesktop.json', import.meta.url), 'utf8')) as { source: string }).source;
const TOKENS = 'page-bg surface-bg surface-alt-bg input-bg text-strong text-default text-muted border-default border-subtle status-success-bg status-success-text status-error-bg status-error-text'.split(' ');

function target(): M4PageTarget {
  return {
    project: 102047, module: 'controleEstoque', pageId: 'produtos', device: 'desktop',
    page11: parseL2Page11(input.pages.produtos.desktop).definition,
    sharedClassName: 'ControleEstoqueProdutosShared', locales: ['pt'], tokens: TOKENS,
  };
}
// Errors refuse the page (contract); advisories are design observations kept in the receipt (01/10/2026).
const codes = (source: string) => gateM4PageSource(source, target()).filter(item => item.severity === 'error').map(item => item.code).sort();
const advisories = (source: string, at = target()) => gateM4PageSource(source, at).filter(item => item.severity === 'advisory').map(item => item.code).sort();

test('names: class, tag and molecule import path are derived from the path', () => {
  assert.equal(m4PageClassName('controleEstoque', 'desktop', 'produtos'), 'ControleEstoqueDesktopPage11ProdutosPage');
  assert.equal(m4PageTag(102047, 'controleEstoque', 'mobile', 'produtos'), 'controle-estoque--web--mobile--page11--produtos-102047');
  assert.equal(m4MoleculeImport('groupviewtable--ml-data-table'), '/_102040_/l2/molecules/groupviewtable/ml-data-table.js');
});

test('the reference desktop page passes the gate with no issue', () => {
  assert.deepEqual(gateM4PageSource(reference, target()), []);
});

test('organisms, intents and the molecule list are contract; sections and unused molecule entries are design', () => {
  const noSection = reference.replace('data-section-id="cadastro"', 'data-section-id="novo"');
  assert.deepEqual(codes(noSection), []);
  assert.deepEqual(advisories(noSection), ['M4_PAGE_SECTION']);
  assert.deepEqual(codes(reference.replace('data-organism-id="alertasSaldoBaixo"', 'data-organism-id="alertas"')), ['M4_PAGE_ORGANISM']);
  assert.deepEqual(codes(reference.replaceAll('this.abrirMovimentacoes()', 'this.selecionarProduto(null)')), ['M4_PAGE_INTENT']);
  const noCardGrid = reference.replaceAll('groupviewdata--ml-card-grid', 'groupviewdata--ml-calendar-view');
  assert.deepEqual(codes(noCardGrid), ['M4_PAGE_MOLECULE'], 'a tag outside the list is refused');
  assert.deepEqual(advisories(noCardGrid), ['M4_PAGE_MOLECULE_UNUSED'], 'an unserved entry is only observed');
  const notImported = reference.replace("import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';\n", '');
  assert.deepEqual(codes(notImported), ['M4_PAGE_MOLECULE_IMPORT']);
});

test('the alternative molecule of an entry is accepted instead of the preferred one', () => {
  const alternative = reference
    .replaceAll('groupviewmetric--ml-metric-card', 'groupviewmetric--ml-metric-big-number')
    .replace("'/_102040_/l2/molecules/groupviewmetric/ml-metric-card.js'", "'/_102040_/l2/molecules/groupviewmetric/ml-metric-big-number.js'");
  assert.deepEqual(codes(alternative), []);
});

test('the page holds no state, no backend call and no lifecycle', () => {
  assert.deepEqual(codes(reference.replace("import { html, nothing } from 'lit';", "import { html, nothing } from 'lit';\nimport { execBff } from '/_102029_/l2/bffClient.js';")), ['M4_PAGE_BACKEND', 'M4_PAGE_IMPORT']);
  assert.deepEqual(codes(reference.replace('  private msg: PageMessageType = pageMessage_pt;', "  private msg: PageMessageType = pageMessage_pt;\n  @state() private open = false;")), ['M4_PAGE_FORBIDDEN']);
  assert.deepEqual(codes(reference.replace('  renderLoadError() {', '  connectedCallback() { super.connectedCallback(); }\n\n  renderLoadError() {')), ['M4_PAGE_FORBIDDEN']);
});

test('visible text must come from the catalogue', () => {
  assert.deepEqual(codes(reference.replace("<Label>${this.msg['form.submit']}</Label>", '<Label>Cadastrar</Label>')), ['M4_PAGE_TEXT']);
  assert.deepEqual(codes(reference.replace("placeholder=${this.msg['lista.search.placeholder']}", 'placeholder="Nome do produto"')), ['M4_PAGE_TEXT']);
  assert.deepEqual(codes(reference.replace("const pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt };", "const pageMessage_en: PageMessageType = pageMessage_pt;\nconst pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt, 'en': pageMessage_en };")), ['M4_PAGE_I18N']);
  assert.deepEqual(codes(reference.replace('    this.msg = pageMessages[this.getMessageKey(pageMessages)];\n', '')), ['M4_PAGE_I18N']);
});

test('i18n: the names are the contract, not the exact declaration text (movimentacoes/desktop, 01/10)', () => {
  for (const variant of [
    reference.replace('  private msg: PageMessageType = pageMessage_pt;', '  private msg = pageMessage_pt;'),
    reference.replace('  private msg: PageMessageType = pageMessage_pt;', '  private msg: typeof pageMessage_pt = pageMessage_pt;'),
    reference.replace("const pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt };", "const pageMessages: Record<string, PageMessageType> = { pt: pageMessage_pt };"),
    reference.replace('    this.msg = pageMessages[this.getMessageKey(pageMessages)];\n    // scenes:', '    // resolve the language first\n    this.msg = pageMessages[this.getMessageKey(pageMessages)];\n    // scenes:'),
  ]) {
    assert.notEqual(variant, reference);
    assert.deepEqual(codes(variant), [], variant.slice(0, 0));
  }
  const missingMsg = reference.replace('  private msg: PageMessageType = pageMessage_pt;\n', '');
  assert.match(gateM4PageSource(missingMsg, target()).find(item => item.code === 'M4_PAGE_I18N')!.message, /private msg: PageMessageType = pageMessage_<default locale>/u);
});

test('colors only through design tokens with theme-free fallbacks', () => {
  assert.deepEqual(codes(reference.replace('bg-[var(--surface-bg,transparent)] p-4', 'bg-white p-4')), ['M4_PAGE_STYLE']);
  assert.deepEqual(codes(reference.replace('bg-[var(--surface-bg,transparent)] p-4', 'bg-[var(--surface-bg,#ffffff)] p-4')), ['M4_PAGE_STYLE', 'M4_PAGE_TOKEN']);
  assert.deepEqual(codes(reference.replace('bg-[var(--surface-bg,transparent)] p-4', 'bg-[var(--card-bg,transparent)] p-4')), ['M4_PAGE_TOKEN']);
  assert.deepEqual(codes(reference.replace('text-[var(--text-muted,currentColor)]">${this.msg[\'alertas.title\']}', 'text-gray-500 dark:text-gray-300">${this.msg[\'alertas.title\']}')), ['M4_PAGE_STYLE', 'M4_PAGE_STYLE'], 'palette and dark: are two issues');
});

// Scenes are decided by the page (Guilherme, 01/10/2026): the desktop reference has none, the mobile one has three.
const mobileReference = (JSON.parse(readFileSync(new URL('./fixtures/produtosMobile.json', import.meta.url), 'utf8')) as { source: string }).source;
const mobileTarget = (): M4PageTarget => ({ ...target(), device: 'mobile', page11: parseL2Page11(input.pages.produtos.mobile).definition });
const mobileCodes = (source: string) => gateM4PageSource(source, mobileTarget()).filter(item => item.severity === 'error').map(item => item.code).sort();

test('scenes: both references use scenes, desktop included (Guilherme, 01/10: no "linguiça" page)', () => {
  assert.deepEqual(gateM4PageSource(mobileReference, mobileTarget()), []);
  assert.ok(reference.includes('<Scene value="cadastro"') && reference.includes("this.setScenario('cadastro')"));
});

test('scenes: where a task form lives is a design choice; no check and no observation (05/10)', () => {
  const stacked = reference
    .replace('            <Scene value="cadastro" title=${this.msg[\'scene.cadastro\']} nav="back">${this.renderSceneCadastro()}</Scene>\n', '')
    .replace("          ${this.renderDetalheProduto()}\n        </section>\n      </div>`;", "          ${this.renderDetalheProduto()}\n        </section>\n        ${this.renderSceneCadastro()}\n      </div>`;");
  assert.notEqual(stacked, reference);
  assert.deepEqual(codes(stacked), []);
  assert.ok(!gateM4PageSource(stacked, target()).some(item => item.code === 'M4_PAGE_TASK_SCENE'));
});

test('scenes: a form in a primary section is the purpose of the page and may be the base scene (movimentacoes, 01/10)', () => {
  const movimentacoes: M4PageTarget = { ...target(), pageId: 'movimentacoes', device: 'mobile', page11: parseL2Page11(input.pages.movimentacoes.mobile).definition };
  assert.equal(movimentacoes.page11.sections[0].priority, 'primary');
  assert.ok(movimentacoes.page11.sections[0].organisms.includes('formularioMovimentacao'));
  const source = [
    'render() {',
    "  // scenes: register — registering is the purpose of the page; history — the history is consulted on demand",
    "  return html`<molecules--ml-scenary-102020 mode=\"scenary\" .value=${this.scenary || 'register'} @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}>",
    "    <Scene value=\"register\" title=${this.msg['scene.register']}>${this.renderSceneRegister()}</Scene>",
    "    <Scene value=\"history\" title=${this.msg['scene.history']} nav=\"back\">${this.renderSceneHistory()}</Scene>",
    '  </molecules--ml-scenary-102020>`;',
    '}',
    'renderSceneRegister() {',
    "  return html`<section data-section-id=\"registroMovimentacao\"><div data-organism-id=\"formularioMovimentacao\"></div><div data-organism-id=\"acoesRegistro\"></div></section>`;",
    '}',
    'renderSceneHistory() {',
    "  return html`<section data-section-id=\"historicoMovimentacoes\"><div data-organism-id=\"historicoMovimentacoes\"></div></section>`;",
    '}',
  ].join('\n');
  const codesOf = gateM4PageSource(source, movimentacoes).map(item => item.code);
  assert.ok(!codesOf.includes('M4_PAGE_TASK_SCENE'), 'the primary form may be the base scene');
  // Scene order wins over section order once the page has scenes: history before register is fine too.
  const swapped = source.replace('<Scene value="register"', '<Scene value="tmp"').replace('<Scene value="history"', '<Scene value="register"').replace('<Scene value="tmp"', '<Scene value="history"');
  assert.ok(!gateM4PageSource(swapped, movimentacoes).some(item => item.code === 'M4_PAGE_SECTION'));
});

test('scenes: a page without a host needs no comment; the design answer records the decision', () => {
  const page11 = parseL2Page11(input.pages.produtos.desktop).definition;
  const reading: M4PageTarget = { ...target(), page11: { ...page11, organisms: Object.fromEntries(Object.entries(page11.organisms).map(([id, row]) => [id, row.kind === 'form' ? { ...row, kind: 'detail' } : row])) } };
  const scenary = (source: string) => gateM4PageSource(source, reading).filter(item => item.code.startsWith('M4_PAGE_SCENARY') || item.code === 'M4_PAGE_TASK_SCENE').map(item => item.code);
  assert.deepEqual(scenary('render() {\n    return 1;\n}'), []);
  assert.deepEqual(scenary('render() {\n    return html`<Scene value="a"></Scene>`;\n}'), ['M4_PAGE_SCENARY'], 'a <Scene> outside the host is still refused');
});

test('scenes: when used, the host must be imported and bound to the shared state (contract)', () => {
  assert.deepEqual(mobileCodes(mobileReference.replace("import '/_102020_/l2/molecules/ml-scenary.js';\n", '')), ['M4_PAGE_SCENARY']);
  assert.deepEqual(mobileCodes(mobileReference.replace(".value=${this.scenary || 'base'}", 'value="base"')), ['M4_PAGE_SCENARY']);
  assert.deepEqual(mobileCodes(mobileReference.replace('@change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}', '')), ['M4_PAGE_SCENARY']);
  // produtos 02/10: Tab out of ml-number-input (change on blur, bubbling) switched the scene back
  const unguarded = mobileReference.replace('{ if (e.target === e.currentTarget) this.setScenario(e.detail.value); }', 'this.setScenario(e.detail.value)');
  assert.notEqual(unguarded, mobileReference);
  const bubble = gateM4PageSource(unguarded, mobileTarget()).filter(item => item.code === 'M4_PAGE_SCENARY_BUBBLE');
  assert.ok(bubble.length === 1 && bubble[0].always === true);
  assert.deepEqual(mobileCodes(mobileReference.replace(/^\s*\/\/ scenes:.*\n/mu, '\n')), [], 'the comment is no longer required');
  const oneScene = mobileReference
    .replace('            <Scene value="detalhe" title=${this.msg[\'scene.detalhe\']} nav="back">${this.renderSceneDetalhe()}</Scene>\n', '')
    .replace('            <Scene value="cadastro" title=${this.msg[\'scene.cadastro\']} nav="back">${this.renderSceneCadastro()}</Scene>\n', '');
  assert.deepEqual(mobileCodes(oneScene), []);
  assert.deepEqual(advisories(oneScene, mobileTarget()), [], 'one scene is a design choice (05/10)');
  assert.deepEqual(mobileCodes(mobileReference.replace("title=${this.msg['scene.detalhe']}", 'title="Produto"')), ['M4_PAGE_TEXT']);
});

test('views switch only through ml-scenary: hand-made switching is refused even with the gate off (02/10)', () => {
  // the Studio answer of 02/10: views rendered by a condition on this.scenary, without the host
  const handMade = reference.replace(
    /<molecules--ml-scenary-102020[\s\S]*?<\/molecules--ml-scenary-102020>/u,
    "${this.scenary === 'cadastro' ? this.renderSceneCadastro() : this.renderSceneBase()}",
  );
  assert.notEqual(handMade, reference);
  const issues = gateM4PageSource(handMade, target()).filter(item => item.code === 'M4_PAGE_SCENARY_CUSTOM');
  assert.ok(issues.length >= 1 && issues.every(item => item.always === true && item.severity === 'error'));
  assert.match(issues[0].message, /Views switch only through <molecules--ml-scenary-102020>/u);
  // reading the scene state for the host value is the one allowed read
  assert.ok(!gateM4PageSource(reference, target()).some(item => item.code === 'M4_PAGE_SCENARY_CUSTOM'));
});

test('any is refused even with the gate off', () => {
  // the Studio answer of 02/10: `(produto: any) => produto?.name` over ProdutoLoad rendered "—" in every cell
  const withAny = reference.replace(/^(import .*\n)(?!import)/mu, "$1const productName = (produto: any) => produto?.name ?? '';\nconst rowOf = (value: unknown) => value as any;\n");
  assert.notEqual(withAny, reference);
  const issues = gateM4PageSource(withAny, target()).filter(item => item.code === 'M4_PAGE_ANY');
  assert.equal(issues.length, 1);
  assert.ok(issues[0].always === true && issues[0].severity === 'error');
  assert.match(issues[0].message, /\(2×\)/u);
  assert.ok(!gateM4PageSource(reference, target()).some(item => item.code === 'M4_PAGE_ANY'));
});

test('template helpers: nested expressions are removed at any depth', () => {
  assert.equal(withoutExpressions('<p>${a ? html`<b>${x}</b>` : nothing}</p>'), '<p> </p>');
  assert.equal(htmlTemplates('const t = html`<a>${html`<b>z</b>`}</a>`;').length, 2);
});

// agendaClinica/consultas (08–09/10/2026): @search on ml-combobox (it emits input) and @input on
// ml-select-one-autocomplete (it stops the native input) compiled and did nothing, and the lists never loaded.
const molecule = (path: string) => readFileSync(new URL(`../../../../../mls-102040/l2/molecules/${path}.ts`, import.meta.url), 'utf8');

test('the events of a molecule are read from its code: literal CustomEvent names, and helper names when the name is a variable', () => {
  assert.deepEqual(m4MoleculeEvents(molecule('groupselectone/ml-combobox')), ['blur', 'change', 'focus', 'input']);
  assert.deepEqual(m4MoleculeEvents(molecule('groupselectone/ml-select-one-autocomplete')), ['blur', 'change', 'focus']);
  assert.deepEqual(m4MoleculeEvents("this.dispatchEvent(\n  new CustomEvent('row-click', { detail })\n); this.dispatchEvent(new Event('close'));"), ['close', 'row-click']);
  // `new CustomEvent(name, …)` behind a helper: the helper's literal arguments count, so a real event is never refused
  assert.deepEqual(m4MoleculeEvents("private emitRowEvent(name: string) { this.dispatchEvent(new CustomEvent(name, {})); }\nthis.emitRowEvent('save'); this.emitRowEvent('cancel');"), ['cancel', 'save']);
  assert.deepEqual(m4MoleculeEvents('export class Card {}'), []);
});

test('bound events are read from the opening tag only, past the ${…} expressions and quoted values in it', () => {
  const code = "html`<groupselectone--ml-combobox placeholder=\"a > b\" @input=${(e) => { if (a > b) this.x(); }} .items=${list.map(i => html`<Item @click=${() => 1}>x</Item>`)} @change=${this.y}><Label>@fake=${1}</Label></groupselectone--ml-combobox>`";
  assert.deepEqual(m4BoundEvents(code, 'groupselectone--ml-combobox'), ['input', 'change']);
  assert.deepEqual(m4BoundEvents(code, 'groupselectone--ml-select'), [], 'a tag that is only a prefix of another is not matched');
});

test('a listener for an event the molecule never dispatches is refused, even with the gate off; a subset of its events is fine', () => {
  const at = (events: Record<string, string[]>) => ({ ...target(), moleculeEvents: events });
  const unknown = (source: string, events: Record<string, string[]>) => gateM4PageSource(source, at(events)).filter(item => item.code === 'M4_PAGE_EVENT_UNKNOWN');
  const grid = { 'groupviewdata--ml-card-grid': ['row-click', 'selection-change'] };
  assert.deepEqual(unknown(reference, grid), [], 'listening to row-click only, not selection-change, passes');
  const search = reference.replace('<groupviewdata--ml-card-grid', '<groupviewdata--ml-card-grid @search=${() => this.carregarMais()}');
  assert.notEqual(search, reference);
  const refused = unknown(search, grid);
  assert.equal(refused.length, 1);
  assert.equal(refused[0].always, true);
  assert.match(refused[0].message, /<groupviewdata--ml-card-grid> never dispatches "search".*"row-click", "selection-change"/u);
  // native events bubble out of any molecule; a molecule absent from the map (source unread) is not checked
  assert.deepEqual(unknown(reference.replace('<groupviewdata--ml-card-grid', '<groupviewdata--ml-card-grid @click=${() => 1}'), grid), []);
  assert.deepEqual(unknown(search, {}), []);
  // input is a value event: it counts only when the molecule dispatches it (the autocomplete stops the native one)
  assert.equal(unknown(reference.replace('<groupviewdata--ml-card-grid', '<groupviewdata--ml-card-grid @input=${() => 1}'), grid).length, 1);
});

// agendaClinica/consultas (09/10/2026): the scheduling journey lists the patient and professional searches, and no
// control of the page called them, so both lists stayed empty.
test('a journey function only the page can start must be called by the page; the shared\'s own calls and onLoad are exempt', () => {
  const shared = {
    entry: { params: {} }, forms: {}, states: {}, rules: {}, access: { actors: [], grants: [] },
    requests: {
      carregar: { kind: 'qry', trigger: 'onLoad', returns: ['agenda'] },
      buscar: { kind: 'qry', trigger: 'buscar', returns: ['pacientes'] },
      detalhar: { kind: 'qry', trigger: 'detalhar', returns: ['consulta'] },
    },
    functions: {
      carregar: { description: 'Loads the agenda.', calls: 'carregar' },
      buscar: { description: 'Searches patients.', calls: 'buscar' },
      detalhar: { description: 'Loads the selected one.', calls: 'detalhar' },
      selecionar: { description: 'Selects one.' },
    },
    journeys: [
      { step: 'localizar', organisms: [], functions: ['carregar', 'buscar', 'selecionar'] },
      { step: 'conferir', organisms: [], functions: ['selecionar', 'detalhar', 'semFuncao'] },
    ],
  } as unknown as Parameters<typeof m4PageJourneyFunctions>[0];
  const sharedSource = 'public selecionar(id: string): void { void this.detalhar(id); }';
  assert.deepEqual(m4PageJourneyFunctions(shared, sharedSource), [
    { fn: 'buscar', steps: ['localizar'] },
    { fn: 'selecionar', steps: ['localizar', 'conferir'] },
  ], 'carregar is onLoad, detalhar is called by the shared, semFuncao is not a function');

  const at = { ...target(), journeyFunctions: m4PageJourneyFunctions(shared, sharedSource) };
  const uncalled = (source: string) => gateM4PageSource(source, at).filter(item => item.code === 'M4_PAGE_JOURNEY_UNCALLED');
  const refused = uncalled(reference);
  assert.deepEqual(refused.map(item => item.always), [true, true]);
  assert.match(refused[0].message, /"localizar" needs buscar, and nothing calls it: .*this\.buscar\(…\)/u);
  assert.match(refused[1].message, /The journey steps "localizar", "conferir" need selecionar/u);
  const wired = reference.replace('</main>', '<input @input=${() => this.buscar()}><button @click=${() => this.selecionar("1")}></button></main>');
  assert.notEqual(wired, reference);
  assert.deepEqual(uncalled(wired), []);
});
