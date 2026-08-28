/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectPageTemplateHygieneIssues, collectMissingImageRenderIssues, trimSharedI18nForPageContext, orderItems, parseDefs, pageDefinitionForChecks, bindingCommandsOf, buildHumanPrompt, trimDefinitionForPrompt, normalizeGeneratedCode, isMaxTokensFailure, isTimeoutFailure, isSplitWorthyFailure, collectChartEventIssues, collectPageExperienceIssues, orderModuleCompile, collectContractFieldIssues, collectPageCatalogueIssues, collectMissingI18nBlockIssues, collectPageCustomElementTagIssues, expectedPageCustomElementTag, collectEnumTextInputIssues, collectEnumCellLabelIssues, collectIdColumnIssues, collectMutationEnvelopeErrorIssues, collectMutationFeedbackIssues, collectSelectionControlIssues, collectCommandDisabledIssues, collectMissingInitialLoadIssues, dependencyProbeRefs, firstErrorSignature, isSharedDtsArtifactRef, isSharedRuntimeTsRef, itemsShareErrorSignature, materializePlanIdFromPipelineId, sharedDtsArtifactRef, sharedTsRefOfDtsArtifact, buildCompileRepairHint, checkSharedDtsProvenance, sharedSourceHash, stampSharedDtsArtifact, stripSharedDtsStamp } from './cfeMaterializeCore.js';
import { FE3_PAGE21_CHOOSE_SERVICE_EXECUTION, FE3_PAGE21_CONTRACT, FE3_PAGE11_RECURSIVE_RENDER_RECORD, FE3_PAGE11_ORPHAN_I18N_KEY } from '../steps/finalize/fixtures/fe3PetShopGate.fixture.js';
import {
  FE2_PAGE21_HANDWRITTEN_CATALOGUE, FE2_SKELETON_CATALOGUE, FE2_PHANTOM_LOCALE_CATALOGUE,
} from '../steps/materialize/fixtures/fe2PetShopCatalogue.fixture.js';
import { RUN01_TASK_CATALOGUE_DTS, RUN01_TASK_CATALOGUE_SHARED } from '../steps/materialize/fixtures/run01TaskCatalogueDts.fixture.js';

// bugpage21: the EXACT shape generated into
// mls-102051/l2/cafeFlow/web/desktop/page21/shiftWorkspace.ts — `: nothing` in the template with a
// module-level `function nothing()` at the bottom. It compiles and typechecks, and Lit paints the
// function's own source code on screen.
const BROKEN_NOTHING = `
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('cafe-flow--web--desktop--page21--shift-workspace-102051')
export class CafeFlowDesktopPage21ShiftWorkspacePage extends Base {
  render() {
    return html\`
      <section>
        \${this.reportState === 'error' ? html\`<p>err</p>\` : nothing}
      </section>
    \`;
  }
}
function nothing() {
  return html\`\`;
}
`;

// The second real variant found in the same app (page11/stockManagement.ts): a differently named
// invented helper. It IS called, so it renders '' rather than source text — still an invented
// module-level helper the skills forbid, and the next name might not be called.
const BROKEN_NAMED_HELPER = `
import { html } from 'lit';
export class P extends Base {
  render() {
    return html\`\${this.editStockItemState === 'error' ? html\`<p>e</p>\` : nothingOrEmpty('x')}\`;
  }
}
function nothingOrEmpty(_s: string): unknown {
  return '';
}
`;

test('bugpage21: a helper rendered by NAME is reported with the concrete remedy', () => {
  const issues = collectPageTemplateHygieneIssues(BROKEN_NOTHING);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /helper 'nothing' is passed to a template without being called/u);
  assert.match(issues[0], /Lit renders the function source as text/u);
  assert.match(issues[0], /use the Lit sentinel/u);
});

// The blanket ban on module-level functions was dropped: it fired on 5-6 harmless helpers in every
// generation (always repaired, always an extra call) while missing the same risk in a `const` arrow.
// What is checked now is the CALL, which is what actually paints source on the screen.
test('a module-level helper that IS called is legitimate', () => {
  // This fixture calls `nothingOrEmpty('x')` — it returns a string, Lit renders it, nothing breaks.
  assert.deepEqual(collectPageTemplateHygieneIssues(BROKEN_NAMED_HELPER), []);
});

// Verbatim shape of page31/declineChangeOrder.ts of the buildFlowFsm run: the render kept
// `const msg = this.msg` (which the skill teaches) but the i18n block and the getter that define `msg`
// were deleted, on the assumption that the shared base class provides it. It does not.
test('a page that uses this.msg without defining the getter is caught before the compiler', () => {
  const code = [
    "import { html, nothing } from 'lit';",
    "import { BaseX } from '/_102046_/l2/m/web/shared/x.js';",
    'export class P extends BaseX {',
    '  render() { const msg = this.msg; return html`<p>${msg[\'section.title\']}</p>`; }',
    '}',
  ].join('\n');
  const issues = collectPageTemplateHygieneIssues(code);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /defines no `get msg\(\)`/u);
  assert.match(issues[0], /shared base class does NOT provide `msg`/u);

  // An ORGANISM is a plain function with no `this`, and this gate runs on organisms too: the remedy has
  // to point at its own catalog, not at a getter it cannot have.
  const organism = [
    "import { html } from 'lit';",
    'export function renderQueue(host: Host) { const msg = this.msg; return html`<p>${msg.title}</p>`; }',
  ].join('\n');
  const organismIssues = collectPageTemplateHygieneIssues(organism);
  assert.equal(organismIssues.length, 1, organismIssues.join(' | '));
  assert.match(organismIssues[0], /render FUNCTION, which has no `this`/u);
  assert.match(organismIssues[0], /host\.getMessageKey/u);

  // The same file WITH its getter is the normal, correct page — silence.
  const withGetter = code.replace('  render()', '  protected get msg(): M { return pageFallback; }\n  render()');
  assert.deepEqual(collectPageTemplateHygieneIssues(withGetter), []);
});

test('a const arrow helper passed by name is caught too — it used to be invisible', () => {
  const code = [
    "import { html, nothing } from 'lit';",
    'const emptyRow = () => html`<td></td>`;',
    'export class P extends Base { render() { return html`${ok ? html`<td>x</td>` : emptyRow}`; } }',
  ].join('\n');
  const issues = collectPageTemplateHygieneIssues(code);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /helper 'emptyRow' is passed to a template without being called/u);
});

test('bugpage21: the CORRECT page (nothing imported from lit) is accepted', () => {
  // The shape page21/kitchenWorkspace.ts already uses, and what the skills now prescribe.
  const good = `
import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('x-y-102051')
export class P extends Base {
  render() {
    const fmt = (v: number) => v.toFixed(2);          // const helper INSIDE render(): allowed
    return html\`\${this.state === 'error' ? html\`<p>e</p>\` : nothing} \${fmt(1)}\`;
  }
}
`;
  assert.deepEqual(collectPageTemplateHygieneIssues(good), []);
});

test('bugpage21: `null` in the empty branch is also accepted (the page11 style)', () => {
  const good = `
import { html } from 'lit';
export class P extends Base {
  render() { return html\`\${this.ready ? html\`<p>ok</p>\` : null}\`; }
}
`;
  assert.deepEqual(collectPageTemplateHygieneIssues(good), []);
});

test('bugpage21: `nothing` used without the lit import is reported (helper deleted, import forgotten)', () => {
  const halfFixed = `
import { html } from 'lit';
export class P extends Base {
  render() { return html\`\${this.ready ? html\`<p>ok</p>\` : nothing}\`; }
}
`;
  const issues = collectPageTemplateHygieneIssues(halfFixed);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /uses `nothing` for an empty branch but it is not imported/u);
});

test('bugpage21: no false positive on empty input or a page with no conditionals', () => {
  assert.deepEqual(collectPageTemplateHygieneIssues(''), []);
  assert.deepEqual(collectPageTemplateHygieneIssues(`
import { html } from 'lit';
export class P extends Base { render() { return html\`<p>\${this.title}</p>\`; } }
`), []);
});

// ── bugimage.md: a page that binds an image field must render it ────────────────
const DEFS_WITH_IMAGE = `export const menuManagementPage = { pageId: 'menuManagement', layout: { sections: [
  { organisms: [{ intentions: [{ id: 'list', fields: [{ field: 'imageUrl' }, { field: 'name' }] }] }] },
] } } as const;`;

test('bugimage: a page binding imageUrl but rendering no <img> is reported', () => {
  const codeWithoutImg = `render() { return html\`\${this.rows.map(item => html\`<span>\${item.imageUrl}</span>\`)}\`; }`;
  const issues = collectMissingImageRenderIssues(DEFS_WITH_IMAGE, codeWithoutImg);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /binds the image field 'imageUrl' but renders no <img> tag/u);
});

test('bugimage: rendering an <img> satisfies the rule', () => {
  const good = `render() { return html\`\${this.rows.map(item => item.imageUrl ? html\`<img src=\${item.imageUrl} alt=\${item.name} loading="lazy">\` : nothing)}\`; }`;
  assert.deepEqual(collectMissingImageRenderIssues(DEFS_WITH_IMAGE, good), []);
});

test('bugimage: a page whose contract has NO image field is never asked for an <img>', () => {
  const defs = `export const p = { pageId: 'x', layout: { sections: [{ organisms: [{ intentions: [{ fields: [{ field: 'name' }] }] }] }] } } as const;`;
  assert.deepEqual(collectMissingImageRenderIssues(defs, 'render() { return html`<p>x</p>`; }'), []);
  // photoUrl / logoUrl / avatarUrl variants ARE recognised.
  for (const field of ['photoUrl', 'logoUrl', 'avatarUrl', 'thumbnailUrl']) {
    const d = `export const p = { pageId: 'x', fields: [{ field: '${field}' }] } as const;`;
    assert.equal(collectMissingImageRenderIssues(d, 'render() { return html`<p>x</p>`; }').length, 1, field);
  }
});

test('bugimage: empty inputs never throw or report', () => {
  assert.deepEqual(collectMissingImageRenderIssues('', 'code'), []);
  assert.deepEqual(collectMissingImageRenderIssues(DEFS_WITH_IMAGE, ''), []);
});

// ---------------------------------------------------------------------------
// trimSharedI18nForPageContext — used by BOTH materialize paths (Studio + CLI), i18n.md §12.1

const SHARED_3_LOCALES = [
  "import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';",
  '/// **collab_i18n_start**',
  'const message_en = {',
  "  'intent.x.list.empty': 'No projects yet',",
  '};',
  'export type MessageType = typeof message_en;',
  'const message_pt_br: MessageType = {',
  "  'intent.x.list.empty': 'Nenhum projeto',",
  '};',
  'const message_es: MessageType = {',
  "  'intent.x.list.empty': 'Ningun proyecto',",
  '};',
  "export const messages: { [key: string]: MessageType } = { 'en': message_en, 'pt-br': message_pt_br, 'es': message_es };",
  '/// **collab_i18n_end**',
  'export class XBase extends CollabLitElement {}',
].join('\n');

test('trimSharedI18nForPageContext keeps the default locale and drops the rest', () => {
  const out = trimSharedI18nForPageContext(SHARED_3_LOCALES);
  // The page needs the KEY NAMES, which the default locale carries; the translations are pure weight.
  assert.match(out, /const message_en = \{\n {2}'intent\.x\.list\.empty': 'No projects yet',\n\};/u);
  assert.ok(!out.includes("'Nenhum projeto'"), 'pt-br text is gone');
  assert.ok(!out.includes("'Ningun proyecto'"), 'es text is gone');
  assert.ok(out.length < SHARED_3_LOCALES.length, 'the context got smaller');
});

test('trimSharedI18nForPageContext leaves the rest of the file untouched', () => {
  const out = trimSharedI18nForPageContext(SHARED_3_LOCALES);
  // Everything outside the block — imports, the exported type/map and the class — must survive verbatim,
  // or the model loses the surface it generates against.
  assert.match(out, /^import \{ CollabLitElement \}/u);
  assert.match(out, /export type MessageType = typeof message_en;/u);
  assert.match(out, /export const messages: \{ \[key: string\]: MessageType \} = \{ 'en': message_en, 'pt-br': message_pt_br, 'es': message_es \};/u);
  assert.match(out, /export class XBase extends CollabLitElement \{\}$/u);
  assert.match(out, /\/\/\/ \*\*collab_i18n_start\*\*/u);
  assert.match(out, /\/\/\/ \*\*collab_i18n_end\*\*/u);
});

test('trimSharedI18nForPageContext is a no-op when there is nothing to gain', () => {
  const single = SHARED_3_LOCALES
    .replace(/const message_pt_br[\s\S]*?\n\};\n/u, '')
    .replace(/const message_es[\s\S]*?\n\};\n/u, '');
  assert.equal(trimSharedI18nForPageContext(single), single, 'single locale is untouched');
  assert.equal(trimSharedI18nForPageContext('const x = 1;'), 'const x = 1;', 'no i18n block is untouched');
  assert.equal(trimSharedI18nForPageContext(''), '', 'empty source is untouched');
});

// ---------------------------------------------------------------------------
// orderItems: dependsOn decides the order of a split page (paginaDividida.md)

const pageItem = (id: string, outputPath: string, dependsOn?: string[]) =>
  ({ id, type: 'l2_page', outputPath, dependsOn, agent: 'x' }) as Parameters<typeof orderItems>[0][number];

test('orderItems puts a chain link before the page that extends it', () => {
  // Alphabetically the page comes FIRST (`pd` < `pd_O1_…`), so only dependsOn gets this right.
  const ordered = orderItems([
    pageItem('pd__l2_page', '_1_/l2/m/web/desktop/page11/pd.ts', ['pd__O2']),
    pageItem('pd__O2', '_1_/l2/m/web/desktop/page11/pd_O2_risk.ts', ['pd__O1']),
    pageItem('pd__O1', '_1_/l2/m/web/desktop/page11/pd_O1_overview.ts'),
  ]);
  assert.deepEqual(ordered.map(item => item.id), ['pd__O1', 'pd__O2', 'pd__l2_page']);
});

test('orderItems ignores a dependsOn that is not in this run', () => {
  const ordered = orderItems([pageItem('a', '_1_/l2/m/web/desktop/page11/a.ts', ['not-scanned'])]);
  assert.deepEqual(ordered.map(item => item.id), ['a']);
});

test('orderItems never drops an item on a cycle', () => {
  const ordered = orderItems([
    pageItem('x', '_1_/l2/m/web/desktop/page11/x.ts', ['y']),
    pageItem('y', '_1_/l2/m/web/desktop/page11/y.ts', ['x']),
  ]);
  assert.deepEqual(ordered.map(item => item.id).sort(), ['x', 'y']);
});

// ---------------------------------------------------------------------------
// parseDefs: um defs pode carregar N itens (página dividida)

test('parseDefs returns EVERY pipeline item, not just the first', () => {
  // Reading only pipeline[0] made the Studio materialize the first organism and skip the page entirely.
  // Same shape saveFrontendDefs writes: JSON.stringify, so the keys are quoted.
  const src = `export const definition = ${JSON.stringify({ pageId: 'pd' }, null, 2)};\n\nexport const pipeline = ${JSON.stringify([
    { id: 'pd__O1', type: 'l2_page_organism', organism: 'overview', outputPath: '_1_/l2/m/web/desktop/page11/pd_O1.ts' },
    { id: 'pd__l2_page', type: 'l2_page', outputPath: '_1_/l2/m/web/desktop/page11/pd.ts' },
  ], null, 2)} as const;\n`;
  const parsed = parseDefs(src);
  assert.equal(parsed.items.length, 2);
  assert.deepEqual(parsed.items.map(item => item.id), ['pd__O1', 'pd__l2_page']);
  // `item` stays the first, which is what a single-artifact defs always meant.
  assert.equal(parsed.item?.id, 'pd__O1');
});

test('parseDefs on a single-item defs is unchanged', () => {
  const src = `export const definition = ${JSON.stringify({ pageId: 'pd' }, null, 2)};\n\nexport const pipeline = ${JSON.stringify([
    { id: 'pd__l2_page', type: 'l2_page', outputPath: '_1_/l2/m/web/desktop/page11/pd.ts' },
  ], null, 2)} as const;\n`;
  const parsed = parseDefs(src);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.item?.id, 'pd__l2_page');
  assert.equal(parsed.bindings, null);
  assert.equal(typeof parsed.data, 'object');
});

test('parseDefs reads a page11 prose definition (template literal) and the bindings sibling', () => {
  const prose = 'Esta página é Pedidos. Destina-se a o gerente. A página estende a classe base do shared deste workspace.';
  const bindings = [{ command: 'listOrders', kind: 'query', selection: 'single', inputs: [{ name: 'q', stateKey: 'ui.p.q', source: 'userInput', required: false }] }];
  const src = [
    'export const definition = `' + prose + '`;',
    '',
    `export const bindings = ${JSON.stringify(bindings, null, 2)} as const;`,
    '',
    `export const pipeline = ${JSON.stringify([{ id: 'pd__l2_page', type: 'l2_page', outputPath: '_1_/l2/m/web/desktop/page11/pd.ts' }], null, 2)} as const;`,
  ].join('\n');
  const parsed = parseDefs(src);
  assert.equal(parsed.dataExportName, 'definition');
  assert.equal(parsed.data, prose);
  assert.deepEqual(parsed.bindings, bindings);
  const gateInput = pageDefinitionForChecks(parsed) as { pageId: string; dataBindings: unknown[] };
  assert.equal(gateInput.pageId, 'pd');
  assert.deepEqual(gateInput.dataBindings, bindings);
  assert.deepEqual(bindingCommandsOf(parsed.data, parsed.bindings), ['listOrders']);
});

test('parseDefs still returns an object for a page21-style definition (pageObjective stays)', () => {
  const src = `export const definition = ${JSON.stringify({ pageId: 'pd', pageObjective: { goal: 'decide' }, dataBindings: [{ command: 'cmd' }] }, null, 2)};\n\nexport const pipeline = ${JSON.stringify([
    { id: 'pd__l2_page', type: 'l2_page', outputPath: '_1_/l2/m/web/desktop/page21/pd.ts' },
  ], null, 2)} as const;\n`;
  const parsed = parseDefs(src);
  assert.equal(typeof parsed.data, 'object');
  assert.deepEqual((parsed.data as { pageObjective: unknown }).pageObjective, { goal: 'decide' });
  assert.equal(parsed.bindings, null);
  assert.deepEqual(pageDefinitionForChecks(parsed), parsed.data);
});

test('firstExportName skips the bindings sibling even when it is written before definition', () => {
  const src = [
    'export const bindings = [{"command":"x"}] as const;',
    'export const definition = `prose`;',
    'export const pipeline = [{"id":"p","type":"l2_page","outputPath":"_1_/l2/m/web/desktop/page11/p.ts"}] as const;',
  ].join('\n');
  const parsed = parseDefs(src);
  assert.equal(parsed.dataExportName, 'definition');
  assert.equal(parsed.data, 'prose');
});

test('buildHumanPrompt puts page11 prose verbatim, not as a JSON string', () => {
  const prose = 'Esta página é Pedidos. A página estende a classe base do shared.';
  const human = buildHumanPrompt(prose, [], '_1_/l2/m/web/desktop/page11/pd.ts');
  assert.match(human, /## Definition\n\nEsta página é Pedidos/);
  assert.ok(!human.includes('```json'), 'prose must not be wrapped as json');
  assert.equal(trimDefinitionForPrompt('l2_page', prose), prose);
  const objectHuman = buildHumanPrompt({ pageId: 'pd' }, [], '_1_/l2/m/web/desktop/page21/pd.ts');
  assert.match(objectHuman, /```json/);
});

test('normalizeGeneratedCode still rewrites .ts shared imports when definition is prose', () => {
  const item = { id: 'pd', type: 'l2_page', outputPath: '_1_/l2/m/web/desktop/page11/pd.ts' };
  const code = "import { FooBase } from '/_1_/l2/m/web/shared/pd.ts';\nexport class P extends FooBase {}";
  const out = normalizeGeneratedCode(item, 'prose only', code);
  assert.match(out, /web\/shared\/pd\.js/);
});

test('isMaxTokensFailure recognises the collab-llm marker, and nothing else', () => {
  // The reason arrives as text in the trace, not as a finish_reason field (bugMaxTokens_01.json).
  assert.ok(isMaxTokensFailure('llm error (MAX_TOKENS_REACHED) llmTime: 00:11:39.280'));
  assert.ok(!isMaxTokensFailure('collab-llm request timed out after 200000ms'));
  assert.ok(!isMaxTokensFailure(''));
});

test('isTimeoutFailure recognises the shapes a stalled call arrives in', () => {
  assert.ok(isTimeoutFailure('collab-llm request timed out after 200000ms'));
  assert.ok(isTimeoutFailure('connect ETIMEDOUT 10.0.0.1:443'));
  assert.ok(!isTimeoutFailure('llm error (MAX_TOKENS_REACHED)'));
  assert.ok(!isTimeoutFailure(''));
});

test('both over-capacity failures lead to a split, and nothing else does', () => {
  // The cap says it outright; the timeout says it only after its retry — but both end in the same place.
  assert.ok(isSplitWorthyFailure('llm error (MAX_TOKENS_REACHED) llmTime: 00:11:39.280'));
  assert.ok(isSplitWorthyFailure('collab-llm request timed out after 200000ms'));
  assert.ok(!isSplitWorthyFailure('HTTP 422: contract validation failed'));
  assert.ok(!isSplitWorthyFailure('missing generated code; payload=(empty)'));
});

// ---------------------------------------------------------------------------
// collectChartEventIssues: `@chartclick` compila e nunca dispara — o defeito da primeira página
// gerada com a diretiva.

const CHART_PAGE = (body: string) => `import { chart } from '/_102033_/l2/shared/chartRuntime.js';\n${body}`;

test('a @chart* binding is flagged: ECharts emits on the instance, not on the DOM', () => {
  const issues = collectChartEventIssues(CHART_PAGE('html`<div class="h-80" ${chart(o)} @chartclick=${fn}></div>`'));
  assert.equal(issues.length, 1);
  assert.match(issues[0], /never fires/u);
  assert.match(issues[0], /chart\(option, \{ click: handler \}\)/u);
});

test('the other ECharts event names are flagged too', () => {
  assert.equal(collectChartEventIssues(CHART_PAGE('html`<div ${chart(o)} @legendselectchanged=${f}></div>`')).length, 1);
  assert.equal(collectChartEventIssues(CHART_PAGE('html`<div ${chart(o)} @datazoom=${f}></div>`')).length, 1);
});

test('handlers passed to the directive are correct and not flagged', () => {
  assert.deepEqual(collectChartEventIssues(CHART_PAGE('html`<div ${chart(o, { click: fn })}></div>`')), []);
});

test('a page with no chart is never inspected', () => {
  // @chartclick on a page that imports no chart is someone else is custom event — not our business.
  assert.deepEqual(collectChartEventIssues('html`<div @chartclick=${fn}></div>`'), []);
});

// ---------------------------------------------------------------------------
// `source` como instrucao de renderizacao.
// O gate ja proibia id nao-decidido em campo editavel; agora a mensagem NOMEIA a origem do contrato,
// que e o que diz ao modelo o que renderizar no lugar.

const sourceDefs = (source: string, sourceRef?: string) => ({
  dataBindings: [{
    command: 'cmdAssign', kind: 'command',
    inputs: [{ name: 'responsibleFieldWorkerId', stateKey: 'ui.p.input.cmdAssign.responsibleFieldWorkerId', source, ...(sourceRef ? { sourceRef } : {}) }],
  }],
});
const SHARED_WITH_INPUT = {
  states: [{ stateKey: 'ui.p.input.cmdAssign.responsibleFieldWorkerId', name: 'cmdAssignResponsibleFieldWorkerId', kind: 'input' }],
};
const EDITABLE = 'html`<input .value=${this.cmdAssignResponsibleFieldWorkerId} @input=${this.setX}>`';

test('actorDirectory bound to a text field is flagged, and the remedy names the ROLE', () => {
  const issues = collectPageExperienceIssues(sourceDefs('actorDirectory', 'fieldWorker'), SHARED_WITH_INPUT, EDITABLE);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /person picker over the 'fieldWorker' role directory/u);
});

test('selection bound to a text field is flagged, and the remedy names the QUERY', () => {
  const issues = collectPageExperienceIssues(sourceDefs('selection', 'browseProjects'), SHARED_WITH_INPUT, EDITABLE);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /picker over the 'browseProjects' query already on this page/u);
});

test('the older e5 vocabulary is honoured too — 102045 was generated with it', () => {
  // selectedEntity is the e5 name for selection; userInput the e5 name for userDecision.
  assert.equal(collectPageExperienceIssues(sourceDefs('selectedEntity', 'browseProjects'), SHARED_WITH_INPUT, EDITABLE).length, 1);
  assert.deepEqual(collectPageExperienceIssues(sourceDefs('userInput'), SHARED_WITH_INPUT, EDITABLE), []);
});

test('a context source says take it from context, naming the ref when there is one', () => {
  const issues = collectPageExperienceIssues(sourceDefs('derived', 'createInvoice.invoiceId'), SHARED_WITH_INPUT, EDITABLE);
  assert.match(issues[0], /take it from context \(createInvoice\.invoiceId\)/u);
});

test('a user-decided field in an editable control is correct', () => {
  assert.deepEqual(collectPageExperienceIssues(sourceDefs('userDecision'), SHARED_WITH_INPUT, EDITABLE), []);
});

// T11: the module gate compiles per file, and a per-file compile only resolves an import whose model is
// already loaded. Compiling in this order is what lets pass 1 load the dependencies before the files that
// import them — without it a page's contract is unloaded, the import resolves to `any`, and a real
// TS2339 PASSES (which is how one reached `done` with the run reported clean).
test('orderModuleCompile puts contracts before shared before pages', () => {
  const refs = [
    '_102046_/l2/buildFlowFsm/web/desktop/page31/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/shared/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/contracts/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/desktop/page11/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/contracts/clientPicker.ts',
  ];
  assert.deepEqual(orderModuleCompile(refs), [
    '_102046_/l2/buildFlowFsm/web/contracts/clientPicker.ts',
    '_102046_/l2/buildFlowFsm/web/contracts/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/shared/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/desktop/page11/projectCatalogue.ts',
    '_102046_/l2/buildFlowFsm/web/desktop/page31/projectCatalogue.ts',
  ]);
  // Pure: the caller's array is not reordered in place, and an unknown folder simply lands in the last tier.
  const original = ['_102046_/l2/buildFlowFsm/web/other/x.ts', '_102046_/l2/buildFlowFsm/web/contracts/a.ts'];
  const copy = [...original];
  assert.equal(orderModuleCompile(original)[0], '_102046_/l2/buildFlowFsm/web/contracts/a.ts');
  assert.deepEqual(original, copy);
});

// A field the contract does not declare. `${project.clientName}` shipped in a real page whose list output
// has `name`; it was fixed by hand in the module. Validated against the 102 pages of that module: zero
// findings there, and the historical defect caught when reintroduced.
const CONTRACT = [
  'export interface QryListProjectOutput {',
  '  projectId: string;',
  '  clientId: string;',
  '  name: string;',
  '}',
  "export const qryListProjectRoute = 'buildFlowFsm.projectCatalogue.qryListProject' as const;",
  'export interface QryClientPickerOutput {',
  '  clientId: string;',
  '  clientName: string;',
  '}',
].join('\n');

const page = (row: string) => [
  'export class P extends Base {',
  '  render() {',
  '    const projects = this.qryListProjectData ?? [];',
  '    return html`<table>${projects.map((project) => html`<tr><td>' + row + '</td></tr>`)}</table>`;',
  '  }',
  '}',
].join('\n');

test('a page interpolating a field outside the contract is rejected, naming field and contract', () => {
  const issues = collectContractFieldIssues(page('${project.clientName ?? project.clientId}'), CONTRACT);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /`project\.clientName` is not declared by qryListProject/u);
  assert.match(issues[0], /its output is clientId, name, projectId/u);

  // A declared field says nothing.
  assert.deepEqual(collectContractFieldIssues(page('${project.name}'), CONTRACT), []);
});

test('the gate stays silent where it cannot know — the shapes that produced false findings on real pages', () => {
  // 1. An i18n KEY reads exactly like a property access.
  assert.deepEqual(collectContractFieldIssues(page("${msg['project.start']}"), CONTRACT), []);
  // 2. A nested read: the shape of `project.owner` is not this function's business.
  assert.deepEqual(collectContractFieldIssues(page('${project.owner.name}'), CONTRACT), []);
  // 3. A row name bound to TWO different queries is ambiguous (pages reuse `item` for every grid).
  // Both queries are declared by the contract, so `items` genuinely could be either.
  const twoLists = [
    'const items = this.qryListProjectData ?? [];',
    'const items = this.qryClientPickerData ?? [];',
    '${items.map((item) => html`${item.whatever}`)}',
  ].join('\n');
  assert.deepEqual(collectContractFieldIssues(twoLists, CONTRACT), []);
  // 4. No contract, or a contract with no Output interface: nothing to compare against.
  assert.deepEqual(collectContractFieldIssues(page('${project.clientName}'), ''), []);
  assert.deepEqual(collectContractFieldIssues(page('${project.clientName}'), 'export const x = 1;'), []);
  // 5. Array built-ins are not contract fields.
  assert.deepEqual(collectContractFieldIssues(page('${projects.length}'), CONTRACT), []);
});

// ── catálogo reescrito à mão (famílias A e D do run fe2, 22/08) ───────────────
void test('collectPageCatalogueIssues acusa o catálogo reescrito à mão, com nome e remédio', () => {
  const issues = collectPageCatalogueIssues(FE2_PAGE21_HANDWRITTEN_CATALOGUE);
  // O defeito é nomeado no loop que salvou o arquivo, não como diagnóstico do gate do módulo.
  const rebuilt = issues.find(issue => issue.startsWith('catalogue rebuilt by hand'));
  assert.ok(rebuilt, `esperava o finding de catálogo reescrito, veio: ${JSON.stringify(issues)}`);
  assert.match(rebuilt!, /collab_i18n_en, collab_i18n_pt, collab_i18n_es/);
  assert.match(rebuilt!, /pageMessage_<locale>/);
  // E o `as const`, que é o que transforma 3 idiomas em 6× TS2322.
  assert.ok(issues.some(issue => /frozen with `as const`/.test(issue)), JSON.stringify(issues));
});

void test('collectPageCatalogueIssues NÃO acusa o bloco que o esqueleto emite', () => {
  assert.deepEqual(collectPageCatalogueIssues(FE2_SKELETON_CATALOGUE), []);
  assert.deepEqual(collectPageCatalogueIssues(''), []);
  // Dois idiomas de verdade (en + en-AU) são legítimos: um const por locale, nenhum duplicado.
  const twoLocales = `
const pageMessage_en = { 'a.b': 'A' };
type PageMessageType = typeof pageMessage_en;
const pageMessage_en_au: PageMessageType = { 'a.b': 'A' };
const pageMessages: { [key: string]: PageMessageType } = { 'en': pageMessage_en, 'en-au': pageMessage_en_au };
`;
  assert.deepEqual(collectPageCatalogueIssues(twoLocales), []);
});

void test('collectPageCatalogueIssues acusa o MESMO locale duas vezes — e só isso', () => {
  // Duplicata literal do mesmo locale: a segunda cópia é o que diverge e produz o TS2353.
  const duplicated = `
const pageMessage_pt_br = { 'a.b': 'A' };
type PageMessageType = typeof pageMessage_pt_br;
const pageMessage_pt_br: PageMessageType = { 'a.b': 'A', 'c.d': 'C' };
`;
  const issues = collectPageCatalogueIssues(duplicated);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /locale 'pt-br' has 2 catalogues/);
  // O fantasma 'pt' + 'pt-br' NÃO é acusado aqui de propósito: textualmente ele é indistinguível do
  // caso legítimo 'en' + 'en-AU'. Quem o elimina é catalogueLocales (T5), na fonte do conjunto.
  assert.deepEqual(collectPageCatalogueIssues(FE2_PHANTOM_LOCALE_CATALOGUE), []);
});

// ── bloco i18n AUSENTE (run02 do 102047, 26/08) ───────────────────────────────
// Recorte VERBATIM de mls-102047/l2/todo/web/desktop/page11/reviewAndProgressTasks.ts: sem os marcadores
// do skeleton, `type PageMessageType = {...}` literal escrito à mão e um único locale `en` num módulo que
// declara pt-br/en/es. Passou por todos os gates e o @@addLanguage o pulou ('without catalogue 1').
const RUN02_PAGE_WITHOUT_MARKERS = `
type PageMessageType = {
  'page.title': string;
  refresh: string;
};

const pageMessage_en: PageMessageType = {
  'page.title': 'Review and progress tasks',
  refresh: 'Refresh',
};

const pageMessages = { en: pageMessage_en };
`;

void test('collectMissingI18nBlockIssues acusa a página sem os marcadores (run02/102047) e orienta o repair', () => {
  const issues = collectMissingI18nBlockIssues(RUN02_PAGE_WITHOUT_MARKERS, 'page');
  assert.equal(issues.length, 1, JSON.stringify(issues));
  assert.match(issues[0], /collab_i18n_start/);
  assert.match(issues[0], /restore the skeleton i18n block/);
});

void test('collectMissingI18nBlockIssues NÃO acusa o bloco que o esqueleto emite', () => {
  // Um locale (default inferido) — o mesmo fixture verbatim do check antigo.
  assert.deepEqual(collectMissingI18nBlockIssues(FE2_SKELETON_CATALOGUE, 'page'), []);
  assert.deepEqual(collectMissingI18nBlockIssues('', 'page'), []);
  // Três locales como o skeleton os emite: default inferido, os demais com a anotação de paridade.
  const threeLocales = `
/// **collab_i18n_start**
const pageMessage_pt_br = { 'a.b': 'A' };
type PageMessageType = typeof pageMessage_pt_br;
const pageMessage_en: PageMessageType = { 'a.b': 'A' }; // collab_untranslated
const pageMessage_es: PageMessageType = { 'a.b': 'A' }; // collab_untranslated
const pageMessages: { [key: string]: PageMessageType } = { 'pt-br': pageMessage_pt_br, 'en': pageMessage_en, 'es': pageMessage_es };
/// **collab_i18n_end**
`;
  assert.deepEqual(collectMissingI18nBlockIssues(threeLocales, 'page'), []);
});

void test('collectMissingI18nBlockIssues aceita o organismo com o<n>Message_* e acusa o vocabulário trocado', () => {
  const organism = `
/// **collab_i18n_start**
const o2Message_pt_br = { 'a.b': 'A' };
type O2Msg = typeof o2Message_pt_br;
const o2Message_en: O2Msg = { 'a.b': 'A' }; // collab_untranslated
const o2Messages: { [key: string]: O2Msg } = { 'pt-br': o2Message_pt_br, 'en': o2Message_en };
/// **collab_i18n_end**
`;
  assert.deepEqual(collectMissingI18nBlockIssues(organism, 'organism'), []);
  // O MESMO conteúdo julgado como página: o vocabulário o<n>Message_* não é o de página.
  const asPage = collectMissingI18nBlockIssues(organism, 'page');
  assert.ok(asPage.some(issue => /no `pageMessage_<locale>` catalogue const/.test(issue)), JSON.stringify(asPage));
});

void test('collectMissingI18nBlockIssues acusa paridade e mapa ausentes, cada um por si', () => {
  // Locale não-default SEM a anotação: o compilador perde a paridade (TS2741/TS2353 deixam de existir).
  const noParity = `
/// **collab_i18n_start**
const pageMessage_pt_br = { 'a.b': 'A' };
type PageMessageType = typeof pageMessage_pt_br;
const pageMessage_en = { 'a.b': 'A' };
const pageMessages: { [key: string]: PageMessageType } = { 'pt-br': pageMessage_pt_br, 'en': pageMessage_en };
/// **collab_i18n_end**
`;
  const parityIssues = collectMissingI18nBlockIssues(noParity, 'page');
  assert.equal(parityIssues.length, 1, JSON.stringify(parityIssues));
  assert.match(parityIssues[0], /'pageMessage_en' has no `: PageMessageType` parity annotation/);
  // Sem o mapa: o getter msg não tem por onde resolver o locale.
  const noMap = `
/// **collab_i18n_start**
const pageMessage_pt_br = { 'a.b': 'A' };
type PageMessageType = typeof pageMessage_pt_br;
/// **collab_i18n_end**
`;
  const mapIssues = collectMissingI18nBlockIssues(noMap, 'page');
  assert.equal(mapIssues.length, 1, JSON.stringify(mapIssues));
  assert.match(mapIssues[0], /`pageMessages` is missing/);
});

void test('página com collab_i18n_* manual continua caindo no check ANTIGO (não regrediu)', () => {
  // O check novo também a acusa (não há pageMessage_*), mas o antigo é quem nomeia o remédio certo.
  const old = collectPageCatalogueIssues(FE2_PAGE21_HANDWRITTEN_CATALOGUE);
  assert.ok(old.some(issue => issue.startsWith('catalogue rebuilt by hand')), JSON.stringify(old));
});

// ── família B do run fe2: campo lido do registro SELECIONADO ─────────────────
// page21/recordInStoreServiceAttendance.ts: `const selected = rows.find(…)` e depois
// `selected.inStorePaymentId` — 7× TS2339. Os campos existem, mas na saída dos COMANDOS
// registerPetArrival/registerServiceStart, não no outputShape da query.
const FE2_CONTRACT = `
export interface QryLocateConfirmedServiceAppointmentOutput {
  serviceAppointmentId: string;
  petId: string;
  status: string;
}
`;

void test('collectContractFieldIssues acusa campo de COMANDO lido do registro selecionado', () => {
  const page = `
const rows = this.qryLocateConfirmedServiceAppointmentData ?? [];
const selected = rows.find((row: QryLocateConfirmedServiceAppointmentOutput) => row.serviceAppointmentId === selectedId);
render() {
  return html\`
    <dd>\${selected.status}</dd>
    \${!selected.inStorePaymentId ? html\`<button>pay</button>\` : nothing}
    <dd>\${selected?.completedAt}</dd>
  \`;
}`;
  const issues = collectContractFieldIssues(page, FE2_CONTRACT);
  // `status` é declarado: não acusa. Os dois de comando, sim.
  assert.equal(issues.length, 2, JSON.stringify(issues));
  assert.ok(issues.some(i => /`selected\.inStorePaymentId` is not declared by qryLocateConfirmedServiceAppointment/.test(i)));
  assert.ok(issues.some(i => /`selected\.completedAt` is not declared/.test(i)));
  // O remédio nomeia o caminho certo, senão o repair inventa o campo na query.
  assert.ok(issues.every(i => /output of a COMMAND is read from that command's state/.test(i)));
});

void test('collectContractFieldIssues: seleção por [0]/at(0) conta, e nome ambíguo é descartado', () => {
  const byIndex = `
const rows = this.qryLocateConfirmedServiceAppointmentData ?? [];
const first = rows[0];
render() { return html\`<dd>\${first.pickedUpAt}</dd>\`; }`;
  assert.match(collectContractFieldIssues(byIndex, FE2_CONTRACT)[0] || '', /`first\.pickedUpAt` is not declared/);
  // Duas queries no mesmo nome: adivinhar qual delas era reportaria campo de uma como falta da outra.
  const ambiguous = `
const rows = this.qryLocateConfirmedServiceAppointmentData ?? [];
const rows = this.qryOtherData ?? [];
const selected = rows.find(r => r.x);
render() { return html\`<dd>\${selected.whatever}</dd>\`; }`;
  assert.deepEqual(collectContractFieldIssues(ambiguous, `${FE2_CONTRACT}\nexport interface QryOtherOutput { x: string; }\n`), []);
  // Quoted i18n-looking text is still ignored; a real property read outside a template is not.
  const quoted = `
const rows = this.qryLocateConfirmedServiceAppointmentData ?? [];
const selected = rows.find(r => r.serviceAppointmentId === id);
const key = 'selected.completedAt';`;
  assert.deepEqual(collectContractFieldIssues(quoted, FE2_CONTRACT), []);
  const outsideTemplate = `
const rows = this.qryLocateConfirmedServiceAppointmentData ?? [];
const selected = rows.find(r => r.serviceAppointmentId === id);
const x = selected.completedAt;`;
  assert.match(collectContractFieldIssues(outsideTemplate, FE2_CONTRACT)[0] || '', /`selected\.completedAt` is not declared/);
});

void test('collectContractFieldIssues acusa campo inventado lido num parâmetro tipado como Output (fe3 choose)', () => {
  const page = `
const rows: QryLocateConfirmedServiceAppointmentOutput[] = this.qryLocateConfirmedServiceAppointmentData ?? [];
const selected = rows.find((row: QryLocateConfirmedServiceAppointmentOutput) => row.serviceAppointmentId === selectedId) ?? rows[0];
const choose = (row: QryLocateConfirmedServiceAppointmentOutput): void => {
  this.setCmdRegisterPetArrivalServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
  this.setCmdRegisterServiceStartServiceExecutionServiceExecutionId(row.serviceExecutionId);
};
`;
  const issues = collectContractFieldIssues(page, FE2_CONTRACT);
  assert.ok(issues.some(i => /`row\.serviceExecutionId` is not declared by qryLocateConfirmedServiceAppointment/.test(i)), JSON.stringify(issues));
  assert.ok(issues.every(i => !/`row\.serviceAppointmentId`/.test(i)));
});

// fe4: the THIRD form — type inferred from the list, not `QryXOutput` and not `selected.`.
const FE4_PAGE21_TYPEOF_ROW = `
const rows = this.qryLocateConfirmedServiceAppointmentData ?? [];
const selectedId = this.cmdRegisterPetArrivalServiceAppointmentServiceAppointmentId ||
  this.cmdRegisterServiceStartServiceAppointmentServiceAppointmentId;
const selected = rows.find((row) => row.serviceAppointmentId === selectedId);
const status = selected?.status ?? '';
const selectAppointment = (row: (typeof rows)[number]): void => {
  this.setCmdRegisterPetArrivalServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
  this.setCmdRegisterServiceStartServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
  if (row.serviceExecutionId) {
    this.setCmdRegisterServiceStartServiceExecutionServiceExecutionId(row.serviceExecutionId);
    this.setCmdRegisterServiceCompletionServiceExecutionServiceExecutionId(row.serviceExecutionId);
    this.setCmdRegisterInStorePaymentServiceExecutionServiceExecutionId(row.serviceExecutionId);
    this.setCmdRegisterPetPickupServiceExecutionServiceExecutionId(row.serviceExecutionId);
    this.setCmdHandoffCompletedServiceServiceExecutionServiceExecutionId(row.serviceExecutionId);
  }
};
`;

void test('collectContractFieldIssues acusa campo lido de (typeof rows)[number] — origem, não forma (fe4)', () => {
  const issues = collectContractFieldIssues(FE4_PAGE21_TYPEOF_ROW, FE2_CONTRACT);
  assert.ok(issues.some(i => /`row\.serviceExecutionId` is not declared by qryLocateConfirmedServiceAppointment/.test(i)), JSON.stringify(issues));
  assert.ok(issues.every(i => !/`row\.serviceAppointmentId`/.test(i)), JSON.stringify(issues));
  assert.ok(issues.every(i => /output of a COMMAND is read from that command's state/.test(i)));
});

void test('page customElement tags use the project id; variants differ only by --pageNN--', () => {
  const path21 = '_102047_/l2/petShop/web/desktop/page21/businessHoursCatalogue.ts';
  const path31 = '_102047_/l2/petShop/web/desktop/page31/businessHoursCatalogue.ts';
  assert.equal(expectedPageCustomElementTag(path21), 'pet-shop--web--desktop--page21--business-hours-catalogue-102047');
  assert.equal(expectedPageCustomElementTag(path31), 'pet-shop--web--desktop--page31--business-hours-catalogue-102047');
  const ok = `@customElement('pet-shop--web--desktop--page21--business-hours-catalogue-102047')\nexport class X {}`;
  assert.deepEqual(collectPageCustomElementTagIssues(ok, path21), []);
  const drifted = `@customElement('pet-shop--web--desktop--page21--business-hours-catalogue')\nexport class X {}`;
  assert.match(collectPageCustomElementTagIssues(drifted, path21)[0] || '', /must be 'pet-shop--web--desktop--page21--business-hours-catalogue-102047'/);
  const moduleSuffix = `@customElement('pet-shop--web--desktop--page31--business-hours-catalogue-petShop')\nexport class X {}`;
  assert.match(collectPageCustomElementTagIssues(moduleSuffix, path31)[0] || '', /102047/);
  const cli = readFileSync(new URL('../nodejsMaterializeL2.ts', import.meta.url), 'utf8');
  assert.match(cli, /collectPageCustomElementTagIssues\(code, p\.item\.outputPath\)/);
});

void test('fe3 recortes: family B is now visible to the guard; C and D stay as compile/i18n evidence', () => {
  const issues = collectContractFieldIssues(FE3_PAGE21_CHOOSE_SERVICE_EXECUTION, FE3_PAGE21_CONTRACT);
  assert.ok(issues.some(i => /serviceExecutionId/.test(i)), JSON.stringify(issues));
  assert.match(FE3_PAGE11_RECURSIVE_RENDER_RECORD, /function renderRecord\(value: unknown, imageAlt: string\) \{/);
  assert.match(FE3_PAGE11_RECURSIVE_RENDER_RECORD, /return renderRecord\(entry, imageAlt\)/);
  assert.equal(FE3_PAGE11_ORPHAN_I18N_KEY, 'intent.consultPetHistoryAndPendingServices.qryInspectPetHistoryAndPendingServices.list.column.serviceImages.label');
});

const ENUM_SHARED = {
  states: [{
    stateKey: 'ui.p.input.cmdDecide.status',
    name: 'cmdDecideStatus',
    kind: 'input',
    contractRef: { commandName: 'cmdDecide', direction: 'input', field: 'status' },
  }],
};
const ENUM_CONTRACT = `export interface CmdDecideInput {
  taskId: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
}
export interface CmdDecideOutput { taskId: string; }
`;
const TEXT_BOUND = 'html`<input class="rounded" .value=${this.cmdDecideStatus} @input=${this.handleCmdDecideStatusChange} />`';
const TEXT_TYPED = 'html`<input type="text" .value=${this.cmdDecideStatus} @input=${this.handleCmdDecideStatusChange} />`';
const SELECT_BOUND = 'html`<select .value=${this.cmdDecideStatus} @change=${this.handleCmdDecideStatusChange}></select>`';
const BUTTONS = "html`<button @click=${() => this.setCmdDecideStatus('completed')}>x</button>`";
const TITLE_INPUT = 'html`<input .value=${this.cmdDecideTitle} @input=${this.handleTitle} />`';

void test('enum bound to an untyped text input is flagged with the codes and the select remedy', () => {
  const issues = collectEnumTextInputIssues(ENUM_SHARED, TEXT_BOUND, ENUM_CONTRACT);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /cmdDecide\.status is a closed domain \(pending\|inProgress\|completed\|cancelled\)/);
  assert.match(issues[0], /<select>/);
});

void test('enum bound to type=text is flagged; select, buttons and hidden are not', () => {
  assert.equal(collectEnumTextInputIssues(ENUM_SHARED, TEXT_TYPED, ENUM_CONTRACT).length, 1);
  assert.deepEqual(collectEnumTextInputIssues(ENUM_SHARED, SELECT_BOUND, ENUM_CONTRACT), []);
  assert.deepEqual(collectEnumTextInputIssues(ENUM_SHARED, BUTTONS, ENUM_CONTRACT), []);
  assert.deepEqual(collectEnumTextInputIssues(ENUM_SHARED, 'html`<input type="hidden" .value=${this.cmdDecideStatus} />`', ENUM_CONTRACT), []);
});

void test('a string field (not a union) as text input is not an enum finding', () => {
  const shared = {
    states: [{
      stateKey: 'ui.p.input.cmdDecide.title',
      name: 'cmdDecideTitle',
      kind: 'input',
      contractRef: { commandName: 'cmdDecide', direction: 'input', field: 'title' },
    }],
  };
  assert.deepEqual(collectEnumTextInputIssues(shared, TITLE_INPUT, ENUM_CONTRACT), []);
});

void test('page with no enum field is a no-op even when it has text inputs', () => {
  assert.deepEqual(collectEnumTextInputIssues({ states: [] }, TEXT_BOUND, 'export interface OtherInput { name: string; }'), []);
  assert.deepEqual(collectEnumTextInputIssues(ENUM_SHARED, '', ENUM_CONTRACT), []);
});

void test('shared valueSet flags an enum even when the contract still says string', () => {
  const shared = {
    states: [{
      stateKey: 'ui.p.input.cmdDecide.status',
      name: 'cmdDecideStatus',
      kind: 'input',
      valueSet: ['pending', 'inProgress', 'completed', 'cancelled'],
      contractRef: { commandName: 'cmdDecide', direction: 'input', field: 'status' },
    }],
  };
  const stringContract = 'export interface CmdDecideInput { status: string; }';
  assert.equal(collectEnumTextInputIssues(shared, TEXT_BOUND, stringContract).length, 1);
});

void test('organism host. binding is flagged the same as this.', () => {
  const hostBound = 'html`<input .value=${host.cmdDecideStatus} @input=${host.handleCmdDecideStatusChange} />`';
  assert.equal(collectEnumTextInputIssues(ENUM_SHARED, hostBound, ENUM_CONTRACT).length, 1);
});

void test('enum-as-text gate and the page11/page21 skills land in the same delivery', () => {
  const phase = readFileSync(new URL('../steps/materialize/agentCfeMaterializePhase.ts', import.meta.url), 'utf8');
  assert.match(phase, /collectEnumTextInputIssues\(/);
  const page11 = readFileSync(new URL('../skills/genCfePage11RenderTs.ts', import.meta.url), 'utf8');
  const page21 = readFileSync(new URL('../skills/genCfePage21RenderTs.ts', import.meta.url), 'utf8');
  assert.match(page11, /ENUM NUNCA É TEXTO LIVRE/);
  assert.match(page21, /ENUM NUNCA É TEXTO LIVRE/);
});

const LIST_CONTRACT = `export interface QryListTaskOutput {
  taskId: string;
  title: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  ownerUserId: string;
}
export interface CmdDecideInput {
  taskId: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
}
`;
const RAW_STATUS_CELL = "html`<td>${item.status}</td>`";
const LABELED_STATUS_CELL = "html`<td>${statusLabel[item.status] ?? item.status}</td>`";
const GENERIC_ENUM_COLUMNS = `
const columns = [{ field: 'title' }, { field: 'status' }];
html\`<td>\${displayValue(valueOf(row, column.field))}</td>\`
`;
const GENERIC_ENUM_LABELED = `
const columns = [{ field: 'title' }, { field: 'status' }];
html\`<td>\${column.field === 'status' ? (statusLabel[String(valueOf(row, 'status'))] ?? '') : displayValue(valueOf(row, column.field))}</td>\`
`;
const SELECT_STATUS_WIRE = "html`<option value=${item.status}>${statusLabel[item.status]}</option>`";

void test('enum cell showing the stored code is flagged; label map is the legitimate path', () => {
  const issues = collectEnumCellLabelIssues(RAW_STATUS_CELL, LIST_CONTRACT);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /status is a closed domain \(pending\|inProgress\|completed\|cancelled\)/);
  assert.match(issues[0], /rótulo|label/i);
  assert.deepEqual(collectEnumCellLabelIssues(LABELED_STATUS_CELL, LIST_CONTRACT), []);
});

void test('generic displayValue on a column that is an enum is flagged; a per-field label branch is not', () => {
  assert.equal(collectEnumCellLabelIssues(GENERIC_ENUM_COLUMNS, LIST_CONTRACT).length, 1);
  assert.deepEqual(collectEnumCellLabelIssues(GENERIC_ENUM_LABELED, LIST_CONTRACT), []);
});

void test('enum code as option value (the wire) is not a cell finding', () => {
  assert.deepEqual(collectEnumCellLabelIssues(SELECT_STATUS_WIRE, LIST_CONTRACT), []);
});

void test('page without a closed-domain field is a no-op for enum cells', () => {
  assert.deepEqual(collectEnumCellLabelIssues(RAW_STATUS_CELL, 'export interface QryListTaskOutput { title: string; }'), []);
  assert.deepEqual(collectEnumCellLabelIssues('', LIST_CONTRACT), []);
});

const ID_AND_TITLE_COLUMNS = "const columns = [{ field: 'taskId' }, { field: 'title' }, { field: 'ownerUserId' }];";
const ID_ONLY_COLUMNS = "const columns = [{ field: 'taskId' }, { field: 'status' }];";
const TITLE_TD = "html`<td>${item.taskId}</td><td>${item.title}</td>`";
const ID_IN_OPTION = "html`<option value=${item.taskId}>${item.title}</option>`";

void test('id column next to title/name is flagged; id-only tables and option values are not', () => {
  const issues = collectIdColumnIssues(ID_AND_TITLE_COLUMNS);
  assert.ok(issues.some(item => /taskId/.test(item)), issues.join(' | '));
  assert.ok(issues.some(item => /ownerUserId/.test(item)), issues.join(' | '));
  assert.deepEqual(collectIdColumnIssues(ID_ONLY_COLUMNS), []);
  assert.equal(collectIdColumnIssues(TITLE_TD).length, 1);
  assert.match(collectIdColumnIssues(TITLE_TD)[0], /taskId/);
  assert.deepEqual(collectIdColumnIssues(ID_IN_OPTION), []);
  assert.deepEqual(collectIdColumnIssues(''), []);
});

void test('enum-cell and id-column gates land in the same delivery as the page11/page21 skills', () => {
  const phase = readFileSync(new URL('../steps/materialize/agentCfeMaterializePhase.ts', import.meta.url), 'utf8');
  assert.match(phase, /collectEnumCellLabelIssues\(/);
  assert.match(phase, /collectIdColumnIssues\(/);
  const page11 = readFileSync(new URL('../skills/genCfePage11RenderTs.ts', import.meta.url), 'utf8');
  const page21 = readFileSync(new URL('../skills/genCfePage21RenderTs.ts', import.meta.url), 'utf8');
  assert.match(page11, /CÉLULA DE ENUM MOSTRA O RÓTULO/);
  assert.match(page11, /NÃO É DEFAULT/);
  assert.match(page21, /CÉLULA DE ENUM MOSTRA O RÓTULO/);
  assert.match(page21, /NÃO É DEFAULT/);
});

const LOCATE_PAGE = {
  dataBindings: [
    { command: 'qryLocate', kind: 'query', stateKey: 'ui.p.data.qryLocate', selection: 'single', inputs: [] },
    { command: 'qryInspect', kind: 'query', stateKey: 'ui.p.data.qryInspect', inputs: [
      { name: 'taskId', stateKey: 'ui.p.input.qryInspect.taskId', source: 'routeParam', required: true, presentation: 'route' },
    ] },
    { command: 'cmdDecide', kind: 'command', stateKey: 'ui.p.output.cmdDecide', inputs: [
      { name: 'taskId', stateKey: 'ui.p.input.cmdDecide.taskId', source: 'routeParam', required: true, presentation: 'route' },
      { name: 'status', stateKey: 'ui.p.input.cmdDecide.status', source: 'userInput', required: true, presentation: 'form' },
    ] },
  ],
};
const LOCATE_SHARED = {
  states: [
    { stateKey: 'ui.p.data.qryLocate', name: 'qryLocateData', kind: 'queryResult', collection: true, outputShape: 'array' },
    { stateKey: 'ui.p.data.qryInspect', name: 'qryInspectData', kind: 'queryResult', collection: false, outputShape: 'object' },
    { stateKey: 'ui.p.input.qryInspect.taskId', name: 'qryInspectTaskId', kind: 'input' },
    { stateKey: 'ui.p.input.cmdDecide.taskId', name: 'cmdDecideTaskId', kind: 'input' },
    { stateKey: 'ui.p.input.cmdDecide.status', name: 'cmdDecideStatus', kind: 'input' },
  ],
  actions: [
    { actionId: 'qryLocate', kind: 'query', methodName: 'loadQryLocate', handlerName: 'handleQryLocateClick', inputStateKeys: [], routeParamInputStateKeys: [] },
    { actionId: 'qryInspect', kind: 'query', methodName: 'loadQryInspect', handlerName: 'handleQryInspectClick', inputStateKeys: ['ui.p.input.qryInspect.taskId'], routeParamInputStateKeys: ['ui.p.input.qryInspect.taskId'] },
    { actionId: 'cmdDecide', kind: 'command', methodName: 'cmdDecide', handlerName: 'handleCmdDecideClick' },
  ],
  initialLoads: [{ actionId: 'qryLocate', stateKey: 'ui.p.data.qryLocate' }],
};

const DEAD_TABLE = `
html\`<table><tbody>\${rows.map(item => html\`<tr><td>\${item.taskId}</td></tr>\`)}</tbody></table>
<button type="submit" class="btn" @click=\${this.handleCmdDecideClick} ?disabled=\${isLoading}>Go</button>\`
`;
const ROW_CLICK = `
html\`<table><tbody>\${rows.map(item => html\`<tr class=\${item.taskId === this.cmdDecideTaskId ? 'sel' : ''} @click=\${() => { this.setCmdDecideTaskId(item.taskId); this.setQryInspectTaskId(item.taskId); }}><td>\${item.taskId}</td></tr>\`)}</tbody></table>
<button type="submit" title=\${this.cmdDecideTaskId ? '' : this.msg['needTask']} ?disabled=\${!this.cmdDecideTaskId || isLoading} @click=\${this.handleCmdDecideClick}>Go</button>\`
`;
const SELECT_PICKER = `
html\`<select .value=\${this.cmdDecideTaskId} @change=\${this.handleCmdDecideTaskIdChange}>
  \${rows.map(item => html\`<option value=\${item.taskId}>\${item.title}</option>\`)}
</select>
<select .value=\${this.qryInspectTaskId} @change=\${this.handleQryInspectTaskIdChange}></select>
<button type="submit" title=\${this.msg['needTask']} ?disabled=\${!this.cmdDecideTaskId} @click=\${this.handleCmdDecideClick}>Go</button>\`
`;

void test('a list with selection:single and no row click / select is flagged', () => {
  const issues = collectSelectionControlIssues(LOCATE_PAGE, LOCATE_SHARED, DEAD_TABLE);
  assert.equal(issues.length, 2, issues.join(' | '));
  assert.match(issues[0], /qryInspect\.taskId has no selection control/);
  assert.match(issues[1], /cmdDecide\.taskId has no selection control/);
});

void test('page11 prose defs still feed the selection/disabled/experience gates via bindings', () => {
  const src = [
    'export const definition = `Esta página estende o shared.`;',
    `export const bindings = ${JSON.stringify(LOCATE_PAGE.dataBindings)} as const;`,
    `export const pipeline = ${JSON.stringify([{ id: 'p', type: 'l2_page', outputPath: '_1_/l2/m/web/desktop/page11/p.ts' }])} as const;`,
  ].join('\n');
  const page = pageDefinitionForChecks(parseDefs(src));
  assert.equal(collectSelectionControlIssues(page, LOCATE_SHARED, DEAD_TABLE).length, 2);
  assert.equal(collectCommandDisabledIssues(page, LOCATE_SHARED, DEAD_TABLE).length, 1);
  assert.equal(collectMissingInitialLoadIssues(LOCATE_SHARED, page).length, 1);
});

void test('row click that writes the id (and a select) both pass the selection gate', () => {
  assert.deepEqual(collectSelectionControlIssues(LOCATE_PAGE, LOCATE_SHARED, ROW_CLICK), []);
  assert.deepEqual(collectSelectionControlIssues(LOCATE_PAGE, LOCATE_SHARED, SELECT_PICKER), []);
});

void test('command button without disabled-on-empty-id is flagged; title is required', () => {
  const issues = collectCommandDisabledIssues(LOCATE_PAGE, LOCATE_SHARED, DEAD_TABLE);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /cmdDecide button is clickable with empty required taskId/);
  assert.deepEqual(collectCommandDisabledIssues(LOCATE_PAGE, LOCATE_SHARED, ROW_CLICK), []);
  const noTitle = 'html`<button type="submit" ?disabled=${!this.cmdDecideTaskId} @click=${this.handleCmdDecideClick}>Go</button>`';
  assert.match(collectCommandDisabledIssues(LOCATE_PAGE, LOCATE_SHARED, noTitle)[0], /no title hint/);
});

void test('getById whose only input is a route param must be in initialLoads', () => {
  const missing = collectMissingInitialLoadIssues(LOCATE_SHARED, LOCATE_PAGE);
  assert.equal(missing.length, 1, missing.join(' | '));
  assert.match(missing[0], /qryInspect is a query whose required inputs are route params/);
  const withLoad = { ...LOCATE_SHARED, initialLoads: [
    { actionId: 'qryLocate', stateKey: 'ui.p.data.qryLocate' },
    { actionId: 'qryInspect', stateKey: 'ui.p.data.qryInspect' },
  ] };
  assert.deepEqual(collectMissingInitialLoadIssues(withLoad, LOCATE_PAGE), []);
  assert.equal(collectMissingInitialLoadIssues(LOCATE_SHARED).length, 1);
});

void test('selection/disabled/initialLoad gates and the render skills land in the same delivery', () => {
  const phase = readFileSync(new URL('../steps/materialize/agentCfeMaterializePhase.ts', import.meta.url), 'utf8');
  assert.match(phase, /collectSelectionControlIssues\(/);
  assert.match(phase, /collectCommandDisabledIssues\(/);
  assert.match(phase, /collectMissingInitialLoadIssues\(/);
  const page11 = readFileSync(new URL('../skills/genCfePage11RenderTs.ts', import.meta.url), 'utf8');
  const page21 = readFileSync(new URL('../skills/genCfePage21RenderTs.ts', import.meta.url), 'utf8');
  const shared = readFileSync(new URL('../skills/genCfeSharedTs.ts', import.meta.url), 'utf8');
  assert.match(page11, /SELECTION NUNCA É DECORATIVA/);
  assert.match(page11, /BOTÃO COM PRÉ-CONDIÇÃO/);
  assert.match(page11, /PROSE STRING/);
  assert.doesNotMatch(page11, /dataBindings\[\]: THE source of truth/);
  assert.match(page21, /SELECTION NUNCA É DECORATIVA/);
  assert.match(page21, /BOTÃO COM PRÉ-CONDIÇÃO/);
  assert.match(shared, /syncRouteParams in connectedCallback BEFORE/);
});

const ENVELOPE_SHARED = {
  actions: [{
    actionId: 'cmdDecide',
    kind: 'command',
    methodName: 'cmdDecide',
  }],
};
const ENVELOPE_OK = `
  async cmdDecide(): Promise<void> {
    const response = await execBff(route, params, options);
    if (!response.ok) {
      const errMsg: string = this.readErrorMessage(response.error, 'action.cmdDecide.error');
      this.cmdDecideError = errMsg;
      return;
    }
  }
`;
const ENVELOPE_MESSAGE = `
  async cmdDecide(): Promise<void> {
    const response = await execBff(route, params, options);
    if (!response.ok) {
      this.cmdDecideError = response.error.message;
      return;
    }
  }
`;
const ENVELOPE_HTTP = `
  async cmdDecide(): Promise<void> {
    const response = await execBff(route, params, options);
    if (!response.ok) {
      this.cmdDecideError = 'Erro do servidor (' + String(response.status) + ')';
      return;
    }
  }
`;

const ENVELOPE_OPTIONAL = `
  async cmdCreateTask(): Promise<void> {
    const response = await execBff(route, params, options);
    if (!response.ok) return this.failCommand('cmdCreateTask', response.error?.message ?? 'Falha ao criar');
  }
`;
const ENVELOPE_RECORD_OPTIONAL = `
  async cmdCreateTask(): Promise<void> {
    const record = response.error;
    if (!response.ok) return this.failCommand('cmdCreateTask', record?.message ?? 'Falha ao criar');
  }
`;

void test('mutation handler that drops error.message is flagged; readErrorMessage and error.message pass', () => {
  const bad = collectMutationEnvelopeErrorIssues(ENVELOPE_SHARED, ENVELOPE_HTTP);
  assert.equal(bad.length, 1, bad.join(' | '));
  assert.match(bad[0], /cmdDecide error path does not read error\.message/);
  assert.deepEqual(collectMutationEnvelopeErrorIssues(ENVELOPE_SHARED, ENVELOPE_OK), []);
  assert.deepEqual(collectMutationEnvelopeErrorIssues(ENVELOPE_SHARED, ENVELOPE_MESSAGE), []);
});

void test('optional chaining error?.message (and record?.message) is the envelope, not a false positive', () => {
  const shared = { actions: [{ actionId: 'cmdCreateTask', kind: 'command', methodName: 'cmdCreateTask' }] };
  assert.deepEqual(collectMutationEnvelopeErrorIssues(shared, ENVELOPE_OPTIONAL), []);
  assert.deepEqual(collectMutationEnvelopeErrorIssues(shared, ENVELOPE_RECORD_OPTIONAL), []);
  assert.equal(collectMutationEnvelopeErrorIssues(shared, ENVELOPE_HTTP.replace('cmdDecide', 'cmdCreateTask')).length, 1);
});

void test('query-only shared is a no-op for the envelope gate', () => {
  assert.deepEqual(collectMutationEnvelopeErrorIssues({ actions: [{ actionId: 'list', kind: 'query', methodName: 'loadList' }] }, 'async loadList() { }'), []);
  assert.deepEqual(collectMutationEnvelopeErrorIssues(ENVELOPE_SHARED, ''), []);
});

void test('page error feedback that ignores the error state is flagged', () => {
  const page = { pageId: 'p', dataBindings: [{ command: 'cmdDecide', kind: 'command', inputs: [] }] };
  const shared = { states: [
    { stateKey: 'ui.p.action.cmdDecide.state', name: 'cmdDecideState' },
    { stateKey: 'ui.p.action.cmdDecide.error', name: 'cmdDecideError' },
  ] };
  const generic = "html`<span>${this.cmdDecideState === 'success' ? 'ok' : ''}</span><span>${this.cmdDecideState === 'error' ? 'Falhou' : ''}</span>`";
  const issues = collectMutationFeedbackIssues(page, shared, generic);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /discards the envelope/);
  const withState = "html`<span>${this.cmdDecideState === 'success' ? this.msg['action.cmdDecide.success'] : ''}</span><span>${this.cmdDecideError || this.msg['action.cmdDecide.error']}</span>`";
  assert.deepEqual(collectMutationFeedbackIssues(page, shared, withState), []);
});

void test('envelope-error gate and the shared/page skills land in the same delivery', () => {
  const phase = readFileSync(new URL('../steps/materialize/agentCfeMaterializePhase.ts', import.meta.url), 'utf8');
  assert.match(phase, /collectMutationEnvelopeErrorIssues\(/);
  const sharedSkill = readFileSync(new URL('../skills/genCfeSharedTs.ts', import.meta.url), 'utf8');
  const page11 = readFileSync(new URL('../skills/genCfePage11RenderTs.ts', import.meta.url), 'utf8');
  const page21 = readFileSync(new URL('../skills/genCfePage21RenderTs.ts', import.meta.url), 'utf8');
  assert.match(sharedSkill, /ERROR DISPLAY CONTRACT/);
  assert.match(page11, /ERRO DE MUTAÇÃO É A MENSAGEM DO ENVELOPE/);
  assert.match(page21, /ERRO DE MUTAÇÃO É A MENSAGEM DO ENVELOPE/);
});

test('firstErrorSignature strips mls refs so the same environment fault matches across files', () => {
  const a = firstErrorSignature(["error TS2792: Cannot find module '/_102046_/l2/m/web/contracts/a.js' or its corresponding type declarations."]);
  const b = firstErrorSignature(["error TS2792: Cannot find module '/_102046_/l2/m/web/contracts/b.js' or its corresponding type declarations."]);
  assert.equal(a, b);
  assert.match(a, /TS2792/);
  assert.equal(itemsShareErrorSignature([
    { errors: ['TS2344 sortOrder is wrong'] },
    { errors: ['TS2344 empty sentinel'] },
    { errors: ['cmdCreateTask error path does not read error.message'] },
  ]), false);
  assert.equal(materializePlanIdFromPipelineId('taskHub__l2_shared'), 'materialize-taskhub-l2-shared');
});

// Decision 27/ago (cf_shared_dts_persistido_e_ref): the shared-dts artifact lives BESIDE the shared
// (web/shared/<page>Dts.txt) for human conferral. `Dts.txt`, never `.d.ts`: stor shortNames carry no
// dot (nomes_sem_ponto — '.d.ts' would round-trip as shortName '<page>.d', the SW versionRef-0
// 2-dot family), and .txt is invisible to the mls-base tsc by construction.
test('sharedDtsArtifactRef points beside the shared and round-trips through its inverse', () => {
  const sharedTs = '_102047_/l2/todo/web/shared/taskCatalogue.ts';
  const artifact = sharedDtsArtifactRef(sharedTs);
  assert.equal(artifact, '_102047_/l2/todo/web/shared/taskCatalogueDts.txt');
  assert.equal(isSharedDtsArtifactRef(artifact!), true);
  assert.equal(sharedTsRefOfDtsArtifact(artifact!), sharedTs);
  // never for defs, never for non-shared paths
  assert.equal(sharedDtsArtifactRef('_102047_/l2/todo/web/shared/taskCatalogue.defs.ts'), null);
  assert.equal(sharedDtsArtifactRef('_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts'), null);
  assert.equal(isSharedDtsArtifactRef(sharedTs), false);
  assert.equal(sharedTsRefOfDtsArtifact(sharedTs), null);
  // the artifact itself is not a shared runtime ts (no re-diet loops)
  assert.equal(isSharedRuntimeTsRef(artifact!), false);
});

test('dependencyProbeRefs expands an artifact dep to its shared .ts for staleness/scheduling', () => {
  const artifact = '_102047_/l2/todo/web/shared/taskCatalogueDts.txt';
  assert.deepEqual(dependencyProbeRefs(artifact), [artifact, '_102047_/l2/todo/web/shared/taskCatalogue.ts']);
  assert.deepEqual(dependencyProbeRefs('_102047_/l2/designSystem.ts'), ['_102047_/l2/designSystem.ts']);
});

// ---------------------------------------------------------------------------------------------------
// run01 do 102047 (28/ago): o run fechou `completed`, o `pagesDone` listou as 3 páginas e o módulo NÃO
// COMPILA (5 erros de tsc). Os testes abaixo cobrem os dois elos que a investigação provou.
// ---------------------------------------------------------------------------------------------------

// D4 — o achado IMPOSSÍVEL que queimou as 3 rodadas de repair.
//
// O shared gerado no run01 tem `async cmdCreateTask() { await this.executeCreateTask(undefined); }`, e é
// `executeCreateTask` que lê `response.error?.message`. O detector fatiava só o corpo do wrapper: nenhuma
// implementação correta desse formato conseguia fechar o achado. O repair, disparado por ele, reescreveu
// o shared às cegas e nessa reescrita PERDEU `handleQryListTaskClick` — os TS2551/TS2554 das 3 páginas.
const RUN01_SHARED_COMMANDS = {
  actions: [
    { actionId: 'cmdCreateTask', kind: 'command', methodName: 'cmdCreateTask' },
    { actionId: 'cmdUpdateTask', kind: 'command', methodName: 'cmdUpdateTask' },
    { actionId: 'cmdDeleteTask', kind: 'command', methodName: 'cmdDeleteTask' },
  ],
};

test('D4: o shared do run01 não tem mais achado de envelope — o comando que só delega é seguido um salto', () => {
  const issues = collectMutationEnvelopeErrorIssues(RUN01_SHARED_COMMANDS, RUN01_TASK_CATALOGUE_SHARED);
  assert.deepEqual(issues, [], issues.join(' | '));
  // e a delegação que o detector precisa atravessar é exatamente esta
  assert.match(RUN01_TASK_CATALOGUE_SHARED, /async cmdCreateTask\(\): Promise<void> \{\s*await this\.executeCreateTask\(undefined\);/u);
});

// O ciclo que o aceite pede, na parte que um teste offline PODE provar: achado conhecido => arquivo
// corrigido => achado some. (Convergência do modelo nenhum teste offline prova; o que se prova é que o
// detector está certo e que o repair recebe o necessário — ver os dois testes seguintes.)
test('D4: achado presente no error path que descarta o envelope, ausente depois da correção', () => {
  const broken = `
export class B {
  async cmdCreateTask(): Promise<void> {
    const response = await execBff(route, params);
    if (!response.ok) {
      this.cmdCreateTaskError = 'HTTP ' + response.status;
      return;
    }
  }
}
`;
  const fixed = broken.replace("'HTTP ' + response.status", "response.error?.message ?? 'action.cmdCreateTask.error'");
  const defs = { actions: [{ actionId: 'cmdCreateTask', kind: 'command', methodName: 'cmdCreateTask' }] };
  const before = collectMutationEnvelopeErrorIssues(defs, broken);
  assert.equal(before.length, 1, before.join(' | '));
  assert.match(before[0], /cmdCreateTask error path does not read error\.message/u);
  assert.deepEqual(collectMutationEnvelopeErrorIssues(defs, fixed), []);
});

test('D4: seguir a delegação não cega o detector — o callee que também descarta o envelope segue acusado', () => {
  const source = `
export class B {
  async cmdCreateTask(): Promise<void> {
    await this.executeCreateTask(undefined);
  }

  private async executeCreateTask(signal: AbortSignal | undefined): Promise<void> {
    const response = await execBff(route, params);
    if (!response.ok) {
      this.cmdCreateTaskError = 'HTTP ' + response.status;
    }
  }
}
`;
  const issues = collectMutationEnvelopeErrorIssues({ actions: [{ actionId: 'cmdCreateTask', kind: 'command', methodName: 'cmdCreateTask' }] }, source);
  assert.equal(issues.length, 1, issues.join(' | '));
  // e um corpo que faz OUTRA coisa além de delegar não é seguido (senão um helper qualquer absolveria o comando)
  const alsoWorks = source.replace('await this.executeCreateTask(undefined);', 'this.log(); await this.executeCreateTask(undefined);');
  assert.equal(collectMutationEnvelopeErrorIssues({ actions: [{ actionId: 'cmdCreateTask', kind: 'command', methodName: 'cmdCreateTask' }] }, alsoWorks).length, 1);
});

// D4 — o prompt de repair. No run01 ele NUNCA carregou o arquivo a corrigir: era uma geração de primeira
// passada com uma lista de erros anexada, e o modelo reescrevia a página do zero a cada rodada (1 achado
// de UX na rodada 1 -> 36 erros de sintaxe na rodada 3 -> 2 achados na rodada 4).
test('D4: o hint de repair carrega o arquivo em disco e manda partir DELE', () => {
  const current = 'export class P { handleQryListTaskClick(_e: Event) {} }';
  const hint = buildCompileRepairHint('_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts', ['TS2551 - Property handleQryListTaskClick does not exist'], current);
  assert.match(hint, /START FROM THIS FILE/u);
  assert.ok(hint.includes(current), 'o conteúdo atual tem de viajar no hint');
  assert.match(hint, /TS2551/u);
  assert.match(hint, /Change ONLY what these findings require/u);
  assert.match(hint, /must come back BYTE FOR BYTE/u);
  // sem o arquivo (chamador legado) o hint continua válido, só não promete preservação
  const bare = buildCompileRepairHint('_102047_/l2/x.ts', ['TS1005']);
  assert.doesNotMatch(bare, /START FROM THIS FILE/u);
});

test('D4: um humanPrompt de repair leva achados + arquivo e NENHUM esqueleto em branco', () => {
  const hint = buildCompileRepairHint('_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts', ['qryListTask.sortBy is collection wiring'], 'export class P {}');
  const prompt = buildHumanPrompt({ pageId: 'taskCatalogue' }, [], '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts', hint, undefined);
  assert.match(prompt, /qryListTask\.sortBy is collection wiring/u);
  assert.match(prompt, /START FROM THIS FILE/u);
  assert.doesNotMatch(prompt, /## Skeleton/u);
  // e é o chamador que garante a exclusão: hint => sem esqueleto
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(gen, /repairHint \? undefined : skeleton/u);
});

// D4 — os achados que o slot NÃO consegue recomputar. Um slot carrega só {planId, defPath, itemId,
// attempt} e o gen recompõe compilador + higiene de template; os detectores de defs (enum, sortBy,
// selection control, bloco i18n, tag do custom element, campos de contrato, tokens…) não existem lá. Um
// item quebrado só por eles produzia hint VAZIO — e hint vazio é indistinguível de primeira passada:
// manda o esqueleto em branco e o modelo reescreve às cegas. Por isso o verify grava os achados em disco.
test('D4: o verify grava os achados do item e o gen os lê antes de montar o hint', () => {
  const phase = readFileSync(new URL('../steps/materialize/agentCfeMaterializePhase.ts', import.meta.url), 'utf8');
  assert.match(phase, /saveMaterializeItemFindings\(moduleName, entry\.item\.planId, nextAttempt, \[\.\.\.entry\.blocking, \.\.\.entry\.repairable\]\)/u);
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(gen, /readMaterializeItemFindings\(moduleOfMlsPath\(outputPath\), planId, attempt\)/u);
  // e eles entram no hint junto com o que foi recomputado
  assert.match(gen, /for \(const finding of declaredFindings\)/u);
});

// D1 — proveniência do artefato por CONTEÚDO. No run01 o `taskCatalogueDts.txt` descrevia uma API que o
// shared em disco não tinha mais, e as 3 páginas foram geradas fiéis a ela. mtime não arbitra isso em
// nenhuma das duas camadas: o sync do Studio achata todos os mtimes em disco, e no browser
// `getFileModified` responde MAX_SAFE_INTEGER para qualquer arquivo sujo — a partir da 2ª rodada a
// comparação é MAX vs MAX e lê "fresco" para sempre, no leitor E nos dois escritores.
test('D1: o artefato do run01, como o run o deixou, é recusado — proveniência desconhecida', () => {
  const resolved = checkSharedDtsProvenance(RUN01_TASK_CATALOGUE_DTS, RUN01_TASK_CATALOGUE_SHARED);
  assert.equal(resolved.dts, null);
  assert.match(resolved.reason, /provenance unknown/u);
  // e a divergência que ele teria carregado é real: o artefato DECLARA o handler que o shared perdeu,
  // e declara sem argumento os handlers que o shared exige com (_event: Event) — os 5 erros do tsc.
  assert.match(RUN01_TASK_CATALOGUE_DTS, /handleQryListTaskClick\(\): void;/u);
  assert.doesNotMatch(RUN01_TASK_CATALOGUE_SHARED, /handleQryListTaskClick/u);
  assert.match(RUN01_TASK_CATALOGUE_DTS, /handleCmdCreateTaskClick\(\): void;/u);
  assert.match(RUN01_TASK_CATALOGUE_SHARED, /handleCmdCreateTaskClick\(_event: Event\): void/u);
});

test('D1: o artefato só é servido para o shared que o produziu', () => {
  // o shared que TINHA o handler (o que gerou o artefato do run01) e o que o perdeu
  const withHandler = RUN01_TASK_CATALOGUE_SHARED.replace(
    '  handleQryGetTaskClick(_event: Event): void {',
    '  handleQryListTaskClick(): void {\n    void this.loadQryListTask();\n  }\n\n  handleQryGetTaskClick(_event: Event): void {',
  );
  assert.notEqual(withHandler, RUN01_TASK_CATALOGUE_SHARED);
  const artifact = stampSharedDtsArtifact(RUN01_TASK_CATALOGUE_DTS, withHandler);

  const served = checkSharedDtsProvenance(artifact, withHandler);
  assert.equal(served.reason, 'artifact');
  assert.equal(served.dts, RUN01_TASK_CATALOGUE_DTS);          // o carimbo não vaza para o contexto
  assert.doesNotMatch(served.dts!, /sharedSourceHash/u);

  const refused = checkSharedDtsProvenance(artifact, RUN01_TASK_CATALOGUE_SHARED);
  assert.equal(refused.dts, null);
  assert.match(refused.reason, /artifact stale/u);
});

test('D1: o hash muda com o conteúdo e o carimbo sobrevive a um recarimbo', () => {
  assert.notEqual(sharedSourceHash('a'), sharedSourceHash('b'));
  assert.equal(sharedSourceHash('abc'), sharedSourceHash('abc'));
  const once = stampSharedDtsArtifact('declare class X {}', 'source');
  const twice = stampSharedDtsArtifact(once, 'source');
  assert.equal(twice, once, 'recarimbar não empilha carimbos');
  assert.equal(stripSharedDtsStamp(once), 'declare class X {}');
  assert.equal(checkSharedDtsProvenance('', 'source').dts, null);
  assert.equal(checkSharedDtsProvenance(once, null).dts, null);
});

test('D1: nenhum leitor/escritor do artefato decide por mtime', () => {
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('./cfeMaterializeStudio.ts', import.meta.url), 'utf8');
  const cli = readFileSync(new URL('../nodejsMaterializeL2.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(gen, /getFileModified/u);
  assert.match(gen, /checkSharedDtsProvenance/u);
  assert.match(gen, /stampSharedDtsArtifact/u);
  // o escritor do Studio precisa do carimbo TAMBÉM: só corrigir o leitor deixaria o artefato
  // congelado (MAX >= MAX) e toda página cairia em raw-ts para sempre.
  assert.match(studio, /persistSharedDtsArtifactIfStale[\s\S]{0,900}checkSharedDtsProvenance/u);
  assert.match(studio, /persistSharedDtsArtifactIfStale[\s\S]{0,900}stampSharedDtsArtifact/u);
  assert.match(cli, /function readFreshSharedDts[\s\S]{0,600}checkSharedDtsProvenance/u);
  assert.doesNotMatch(cli.slice(cli.indexOf('function readFreshSharedDts')), /^[\s\S]{0,600}refMtimeMs/u);
});

// D4.4 — o l2_shared entra em `materializeSharedDeterministic` ANTES de qualquer coisa, inclusive numa
// rodada de repair. O scaffold é função pura de defs + contrato: re-salvar a própria saída reganha o
// achado que abriu a rodada e drena o orçamento uma rodada inútil por vez. Igualdade byte a byte só —
// qualquer outra coisa mantém o caminho de hoje.
test('D4.4: numa rodada de repair o scaffold que repete o arquivo em disco cede a vez ao modelo', () => {
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(gen, /if \(attempt >= 2 && previousSource === scaffold\.code\) return null;/u);
  assert.match(gen, /materializeSharedDeterministic\([^)]*genArgs\.attempt \?\? 1\)/su);
});

// D1 — o quarto leitor do artefato. `agentManagePage2.readSharedSurfaceSource` servia o
// `web/shared/<page>Dts.txt` sem NENHUM teste de frescor: entregaria o artefato do run01 — que declara
// um handler que o shared perdeu — como a superfície da classe base para uma edição de página.
test('D1: o leitor do agentManagePage2 também exige proveniência antes de servir o artefato', () => {
  const page2 = readFileSync(new URL('../../aura/agentManagePage2/agentManagePage2.ts', import.meta.url), 'utf8');
  assert.match(page2, /checkSharedDtsProvenance\(persisted, await getContentByMlsPath\(tsRef\)\)/u);
  assert.match(page2, /artifact refused \(\$\{checked\.reason\}\)/u);
});
