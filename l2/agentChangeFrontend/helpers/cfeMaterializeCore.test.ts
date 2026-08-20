/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPageTemplateHygieneIssues, collectMissingImageRenderIssues, trimSharedI18nForPageContext, orderItems, parseDefs, isMaxTokensFailure, isTimeoutFailure, isSplitWorthyFailure, collectChartEventIssues, collectPageExperienceIssues, orderModuleCompile, collectContractFieldIssues } from './cfeMaterializeCore.js';

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
