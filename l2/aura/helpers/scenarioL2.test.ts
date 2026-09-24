/// <mls fileReference="_102020_/l2/aura/helpers/scenarioL2.test.ts" enhancement="_blank"/>
// The reader of the page's own `.ts`. Every fixture below is a VERBATIM slice of a real generated
// page, cited by file and line: the four generator forms, the two places a domain hides, and the two
// traps that a looser reading falls into.
//
// The corpus-wide numbers (58 of 58 pages, 0 keys lost against the l4, 0 mis-pairings over 142
// variations) are measured by a harness against the apps on disk, not here: those apps are evidence
// and they are not in this repo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  aliasesOf,
  bffOfKey,
  domainOf,
  keysOf,
  kindOfKey,
  pairingsOf,
  propertiesOf,
  statesOfPage,
} from '/_102020_/l2/aura/helpers/scenarioL2.js';

// ─── Form 1 of 4: `const SUBSCRIBED_STATE_KEYS` at module level (41 of the 58 pages) ─────────────
// `mls-102050/l2/controleChamados/web/shared/ticketHub.ts:23-32, 36-52, 75-95`.
const FORM_SUBSCRIBED = `const SUBSCRIBED_STATE_KEYS: string[] = [
'ui.ticketHub.status',
'ui.ticketHub.scenary',
'ui.ticketHub.action.qryListTicket.status',
'ui.ticketHub.input.qryListTicket.search',
'ui.ticketHub.input.qryListTicket.sortBy',
'ui.ticketHub.data.qryListTicket',
];
export class ControleChamadosTicketHubBase extends CollabLitElement {
/** state status — pageStatus */
@property() status: string = '';
/** state ui.ticketHub.scenary — uiScenary, values: base */
@property() uiScenary: 'base' = 'base';
/** state qryListTicketState — actionStatus, values: idle|loading|success|error */
@property() qryListTicketState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryListTicketSearch — input */
@property() qryListTicketSearch: string = '';
/** state qryListTicketSortBy — input, values: open|closed */
@property() qryListTicketSortBy: string = '';
/** state qryListTicketData — queryResult, outputShape: array */
@property() qryListTicketData: QryListTicketOutput[] = [];
handleIcaStateChange(key: string, value: unknown): void {
switch (key) {
case 'ui.ticketHub.status':
this.status = (value as string) ?? '';
break;
case 'ui.ticketHub.scenary':
this.uiScenary = (value as 'base') ?? 'base';
break;
case 'ui.ticketHub.action.qryListTicket.status':
this.qryListTicketState = (value as 'idle' | 'loading' | 'success' | 'error') ?? 'idle';
break;
case 'ui.ticketHub.input.qryListTicket.search':
this.qryListTicketSearch = (value as string) ?? '';
break;
case 'ui.ticketHub.input.qryListTicket.sortBy':
this.qryListTicketSortBy = (value as string) ?? '';
break;
case 'ui.ticketHub.data.qryListTicket':
this.qryListTicketData = (value as QryListTicketOutput[]) ?? [];
break;
}
}
}`;

// ─── Form 2 of 4: no list at all — the `case` arms carry the keys (13 pages) ─────────────────────
// `mls-102051/l2/cafeFlow/web/shared/posWorkspace.ts:99-108, 235-246`. Note the DOUBLE-quoted alias.
const FORM_CASE_ARMS = `type ActionStatus = "idle" | "loading" | "success" | "error";
export class CafeFlowPosWorkspaceBase extends CollabLitElement {
  /** state ui.posWorkspace.status — pageStatus */
  @property() status: string = '';
  /** state ui.posWorkspace.action.queryOpenOrders.status — actionStatus, values: idle|loading|success|error */
  @property() queryOpenOrdersState: ActionStatus = 'idle';
  /** state ui.posWorkspace.input.queryOpenOrders.dailyShiftId — input */
  @property() queryOpenOrdersDailyShiftId: string = '';
  handleIcaStateChange(key: string, value: unknown): void {
    switch (key) {
      case 'ui.posWorkspace.status':
        this.status = (value as string) ?? '';
        break;
      case 'ui.posWorkspace.action.queryOpenOrders.status':
        this.queryOpenOrdersState = (value as ActionStatus) ?? 'idle';
        break;
      case 'ui.posWorkspace.input.queryOpenOrders.dailyShiftId':
        this.queryOpenOrdersDailyShiftId = (value as string) ?? '';
        break;
    }
  }
}`;

// ─── Form 3 of 4: only `initStateValue(…)` (3 pages) ─────────────────────────────────────────────
// `mls-102049/l2/petShop/web/shared/catalog.ts:111, 120-126, 217-222`. This one names the property
// itself, as the second argument.
const FORM_INIT_STATE_VALUE = `type ActionStatus = "idle" | "loading" | "success" | "error";
export class PetShopCatalogBase extends CollabLitElement {
  @property() status: string = "";
  @property() featuredProductsState: ActionStatus = "idle";
  @property() featuredProductsCategoryId: string = "";
  connectedCallback(): void {
    super.connectedCallback();
    this.initStateValue("ui.catalog.status", "status", "");
    this.initStateValue("ui.catalog.action.featuredProducts.status", "featuredProductsState", "idle");
    this.initStateValue("ui.catalog.input.featuredProducts.categoryId", "featuredProductsCategoryId", "");
  }
}`;

// ─── Form 4 of 4: `const sharedKeys = [...]` inside `connectedCallback` (1 page) ──────────────────
// `mls-102048/l2/buildFlowFsm/web/shared/clientInvoiceView.ts:43-52, 77-110`.
const FORM_SHARED_KEYS = `export class BuildFlowFsmClientInvoiceViewBase extends CollabLitElement {
  @property({ type: String }) status: string = '';
  @property({ type: String }) viewInvoiceState: "idle" | "loading" | "success" | "error" = "idle";
  @property({ type: String }) viewInvoiceInvoiceId: string = '';
  @property({ type: String }) LayoutColQuantity: string = '';
  connectedCallback(): void {
    super.connectedCallback();

    const sharedKeys = [
      "ui.clientInvoiceView.status",
      "ui.clientInvoiceView.action.viewInvoice.status",
      "ui.clientInvoiceView.input.viewInvoice.invoiceId",
      "ui.clientInvoiceView.layout.col_quantity",
    ];

    for (const key of sharedKeys) {
      const existing = getState(key);
      if (existing !== undefined && existing !== null) {
        if (key === "ui.clientInvoiceView.status") this.status = existing as string;
        else if (key === "ui.clientInvoiceView.action.viewInvoice.status") this.viewInvoiceState = existing as "idle" | "loading" | "success" | "error";
        else if (key === "ui.clientInvoiceView.input.viewInvoice.invoiceId") this.viewInvoiceInvoiceId = existing as string;
        else if (key === "ui.clientInvoiceView.layout.col_quantity") this.LayoutColQuantity = existing as string;
      }
    }
    subscribe(sharedKeys, this);
  }
}`;

test('form 1 — the declared list, the switch arms and the comments agree', () => {
  const states = statesOfPage(FORM_SUBSCRIBED, '');
  assert.deepEqual(states.map((item) => item.key), [
    'ui.ticketHub.status',
    'ui.ticketHub.scenary',
    'ui.ticketHub.action.qryListTicket.status',
    'ui.ticketHub.data.qryListTicket',
    'ui.ticketHub.input.qryListTicket.search',
    'ui.ticketHub.input.qryListTicket.sortBy',
  ]);
  // Every key lands on the property the page itself assigns in its own switch.
  assert.deepEqual(states.map((item) => item.name), [
    'status', 'uiScenary', 'qryListTicketState', 'qryListTicketData',
    'qryListTicketSearch', 'qryListTicketSortBy',
  ]);
  // The page's own states come first, then one uninterrupted run per action — which is what
  // `groupByAction` reads as a block.
  assert.deepEqual(states.map((item) => item.bffId), [
    null, null, 'qryListTicket', 'qryListTicket', 'qryListTicket', 'qryListTicket',
  ]);
});

test('form 2 — with no list, the case arms are the inventory', () => {
  const states = statesOfPage(FORM_CASE_ARMS, '');
  assert.deepEqual(states.map((item) => item.key), [
    'ui.posWorkspace.status',
    'ui.posWorkspace.action.queryOpenOrders.status',
    'ui.posWorkspace.input.queryOpenOrders.dailyShiftId',
  ]);
  assert.deepEqual(states.map((item) => item.name), ['status', 'queryOpenOrdersState', 'queryOpenOrdersDailyShiftId']);
  // A form with no list is NOT a page without states, which is what risk 4 is about.
  assert.ok(states.length > 0);
});

test('form 3 — initStateValue names the key and the property in the same call', () => {
  const states = statesOfPage(FORM_INIT_STATE_VALUE, '');
  assert.deepEqual(states.map((item) => `${item.key} -> ${item.name}`), [
    'ui.catalog.status -> status',
    'ui.catalog.action.featuredProducts.status -> featuredProductsState',
    'ui.catalog.input.featuredProducts.categoryId -> featuredProductsCategoryId',
  ]);
});

test('form 4 — sharedKeys and the if-chain, in DOUBLE quotes', () => {
  // Half the corpus writes its keys with double quotes. Reading only single ones missed two whole
  // pages in the first measurement of this analysis.
  const states = statesOfPage(FORM_SHARED_KEYS, '');
  assert.deepEqual(states.map((item) => item.key), [
    'ui.clientInvoiceView.status',
    'ui.clientInvoiceView.layout.col_quantity',
    'ui.clientInvoiceView.action.viewInvoice.status',
    'ui.clientInvoiceView.input.viewInvoice.invoiceId',
  ]);
  assert.deepEqual(states.map((item) => item.name), [
    'status', 'LayoutColQuantity', 'viewInvoiceState', 'viewInvoiceInvoiceId',
  ]);
  // `layout.col_*` is outside the l4's vocabulary and outside ours: read, counted, offered to nobody.
  const layout = states.find((item) => item.key.includes('layout.'))!;
  assert.equal(layout.kind, 'other');
  assert.equal(layout.editable, false);
});

// ─── The domain: the type, the comment, and the alias in between ────────────────────────────────

test('the domain comes from the TYPE where there is no comment at all', () => {
  // `mls-102048/l2/buildFlowFsm/web/shared/changeOrderLifecycle.ts:57-62`: the whole file has no
  // `/** state … */` anywhere, and the four values are in the declared type.
  const source = `export class BuildFlowFsmChangeOrderLifecycleBase extends CollabLitElement {
  @property({ type: String }) status: string = '';

  @property({ type: String }) createChangeOrderState: "idle" | "loading" | "success" | "error" = 'idle';
    setState('ui.changeOrderLifecycle.action.createChangeOrder.status', 'loading');
}`;
  const states = statesOfPage(source, '');
  const action = states.find((item) => item.kind === 'actionStatus')!;
  assert.equal(action.name, 'createChangeOrderState');
  assert.deepEqual(action.valueSet, ['idle', 'loading', 'success', 'error']);
  assert.equal(action.editable, true);
});

test('the domain comes from the COMMENT where the type is only `string`', () => {
  // `mls-102050/l2/controleChamados/web/shared/ticketHub.ts:43-44`: `sortBy` is declared `string`
  // and the closed domain is in the generated comment. Neither source alone covers the corpus.
  const states = statesOfPage(FORM_SUBSCRIBED, '');
  const sortBy = states.find((item) => item.key.endsWith('.sortBy'))!;
  assert.equal(sortBy.type, 'string');
  assert.deepEqual(sortBy.valueSet, ['open', 'closed']);
  assert.equal(sortBy.editable, true);
  // And the free-text input beside it stays out, which is the whole of D-017.
  const search = states.find((item) => item.key.endsWith('.search'))!;
  assert.equal(search.valueSet, undefined);
  assert.equal(search.editable, false);
});

test('a local type alias still has a domain — one indirection, not a type system', () => {
  // `mls-102048/l2/buildFlowFsm/web/shared/fieldWorkerWorkspace.ts:62, 72`: four actions typed
  // `ActionStatus`, no comment above any of them. Without resolving the alias the one page the whole
  // panel exists for — put an action in `error` — offers nothing.
  const aliases = aliasesOf(FORM_CASE_ARMS);
  assert.equal(aliases.get('ActionStatus'), '"idle" | "loading" | "success" | "error"');
  const states = statesOfPage(FORM_CASE_ARMS, '');
  const action = states.find((item) => item.kind === 'actionStatus')!;
  assert.deepEqual(action.valueSet, ['idle', 'loading', 'success', 'error']);
});

test('the two readings are UNITED, not first-wins', () => {
  // `mls-102050/.../ticketCommentCatalogue.ts:16, 20` is the case that proves it: the type is the
  // alias `Scenary` and the comment carries the same four values. Either source alone leaves a page
  // of the corpus without its scene.
  assert.deepEqual(domainOf("'a' | 'b'", 'state x — input, values: b|c'), ['a', 'b', 'c']);
  // A union that is not all literals is not a closed domain, and neither is a bare type.
  assert.deepEqual(domainOf('string | undefined', ''), []);
  assert.deepEqual(domainOf('QryListTicketOutput[]', ''), []);
  assert.deepEqual(domainOf('string', 'state x — input'), []);
});

// ─── The two traps a looser reading falls into ──────────────────────────────────────────────────

test('an i18n key that LOOKS like a state key never enters the inventory', () => {
  // `mls-102046/l2/buildFlowFsm/web/desktop/page21/consultClientProjectUpdates.ts:52-55, 93`: the
  // rendered page carries its own catalog and its ids are `ui.<page>.<word>`. A loose reading of
  // "any `ui.*` literal" drags 15 of them in across the corpus and the panel then writes a state
  // nobody reads; the anchored reading brings 0.
  const rendered = `const pageMessage_pt = {
  'ui.consultClientProjectUpdates.chooseProject': 'Selecione uma obra',
  'ui.consultClientProjectUpdates.load': 'Consultar',
  'ui.consultClientProjectUpdates.loading': 'Carregando…',
  'ui.consultClientProjectUpdates.noSelection': 'Selecione uma obra para consultar seus dados.',
  'ui.consultClientProjectUpdates.notAvailable': '—',
};
render() {
  return html\`\${this.qryLocateProjectState === 'loading'
    ? html\`<p>\${msg['ui.consultClientProjectUpdates.loading']}</p>\`
    : html\`<p>\${msg['ui.consultClientProjectUpdates.noSelection']}</p>\`}\`;
}`;
  const shared = `const SUBSCRIBED_STATE_KEYS: string[] = ['ui.consultClientProjectUpdates.action.qryLocateProject.status'];
export class X { @property() qryLocateProjectState: 'idle' | 'loading' = 'idle'; }`;

  const keys = keysOf(`${shared}\n${rendered}`);
  assert.deepEqual(keys, ['ui.consultClientProjectUpdates.action.qryLocateProject.status']);
  for (const trap of ['chooseProject', 'load', 'loading', 'noSelection', 'notAvailable']) {
    assert.equal(keys.some((key) => key.endsWith(`.${trap}`)), false, `${trap} is a word, not a state`);
  }
});

test('`key` is not always a state key — a column name never becomes one', () => {
  // `mls-102046/l2/buildFlowFsm/web/desktop/page31/consultApprovedProjectChangeOrders.ts:116`:
  // `Object.entries(row).map(([key, value]) => … key === 'approvedChangeOrderAmount' ? … )`. Reading
  // every `key === '…'` blindly invented 15 states across 2 pages, each of them a data field.
  const rendered = `entries.map(([key, value]: [string, unknown]) => html\`<dt>\${key === 'approvedChangeOrderAmount'
    ? msg['billing.approved'] : key === 'billableAmount' ? msg['billing.billable'] : ''}</dt>\`)`;
  assert.deepEqual(keysOf(rendered), []);
  // And a real discriminant on the same shape still gets through.
  assert.deepEqual(keysOf(`if (key === 'ui.page.action.cmd.status') this.cmdState = value;`),
    ['ui.page.action.cmd.status']);
});

test('the case arms of a switch on a VALUE are not keys either', () => {
  // `switch (this.uiScenary) { case 'detail': … }` — the arms are the domain of a state, not states.
  const source = `switch (this.uiScenary) { case 'detail': return this.renderDetail(); case 'base': return this.renderBase(); }`;
  assert.deepEqual(keysOf(source), []);
});

test('the assignment can sit on EITHER side of the getState, and the pairing follows it', () => {
  // `mls-102048/l2/buildFlowFsm/web/shared/clientChangeOrderReview.ts:70-76`: the restore writes
  // `this.x = (getState('…') as string) ?? ''`. Taking only the assignment AFTER the read paired
  // every key of that page with the NEXT property — the page status ended up on the action's
  // property and the action's on an input's, silently.
  const source = `connectedCallback(): void {
    this.status = (getState('ui.clientChangeOrderReview.status') as string) ?? '';
    this.reviewChangeOrderState =
      (getState('ui.clientChangeOrderReview.action.reviewChangeOrder.status') as
        | "idle" | "loading" | "success" | "error") ?? "idle";
    const savedId = getState('ui.clientChangeOrderReview.input.reviewChangeOrder.changeOrderId');
    this.reviewChangeOrderChangeOrderId = savedId !== undefined ? savedId : '';
  }`;
  const pairs = pairingsOf(source);
  assert.equal(pairs.get('ui.clientChangeOrderReview.status'), 'status');
  assert.equal(pairs.get('ui.clientChangeOrderReview.action.reviewChangeOrder.status'), 'reviewChangeOrderState');
  assert.equal(pairs.get('ui.clientChangeOrderReview.input.reviewChangeOrder.changeOrderId'), 'reviewChangeOrderChangeOrderId');
});

test('the setter pairs by the field it writes right before the setState', () => {
  // `mls-102048/l2/buildFlowFsm/web/shared/changeOrderLifecycle.ts:107-111`.
  const source = `setCreateChangeOrderProjectId(value: string): void {
    this.createChangeOrderProjectId = value;
    setState('ui.changeOrderLifecycle.input.createChangeOrder.projectId', value);
    this.requestUpdate();
  }`;
  assert.equal(pairsOf(source, 'ui.changeOrderLifecycle.input.createChangeOrder.projectId'), 'createChangeOrderProjectId');
});

function pairsOf(source: string, key: string): string | undefined {
  return pairingsOf(source).get(key);
}

// ─── The shape of a key ─────────────────────────────────────────────────────────────────────────

test('every species is read off the shape of the key', () => {
  assert.equal(kindOfKey('ui.page.status'), 'pageStatus');
  assert.equal(kindOfKey('ui.page.scenary'), 'scene');
  assert.equal(kindOfKey('ui.page.action.cmd.status'), 'actionStatus');
  assert.equal(kindOfKey('ui.page.action.cmd.error'), 'actionError');
  assert.equal(kindOfKey('ui.page.input.cmd.title'), 'input');
  assert.equal(kindOfKey('ui.page.data.qry'), 'queryResult');
  assert.equal(kindOfKey('ui.page.output.cmd'), 'commandOutput');
  // The three the l4 never modelled: they are read and counted, and they have no species of their
  // own because they have no behaviour of their own.
  assert.equal(kindOfKey('ui.page.layout.col_list_title'), 'other');
  assert.equal(kindOfKey('ui.page.businessContext.activeCompanyId'), 'other');

  assert.equal(bffOfKey('ui.page.action.cmd.status'), 'cmd');
  assert.equal(bffOfKey('ui.page.input.cmd.title'), 'cmd');
  assert.equal(bffOfKey('ui.page.data.qry'), 'qry');
  assert.equal(bffOfKey('ui.page.status'), null);
  assert.equal(bffOfKey('ui.page.scenary'), null);
});

test('editable is the domain and nothing else', () => {
  // D-017 in one field, in one place. The panel does not get to decide this a second time.
  const source = `const SUBSCRIBED_STATE_KEYS = ['ui.p.action.cmd.status', 'ui.p.action.cmd.error', 'ui.p.data.qry', 'ui.p.output.cmd', 'ui.p.status'];
export class X {
  @property() status: string = '';
  @property() cmdState: 'idle' | 'error' = 'idle';
  @property() cmdError: string = '';
  @property() qryData: Out[] = [];
  @property() cmdOutput: Out | null = null;
}`;
  const states = statesOfPage(source, '');
  assert.deepEqual(states.map((item) => `${item.kind}:${item.editable}`).sort(), [
    'actionError:false', 'actionStatus:true', 'commandOutput:false', 'pageStatus:false', 'queryResult:false',
  ]);
  for (const item of states) assert.equal(item.editable, Boolean(item.valueSet?.length));
});

// ─── The property scan ──────────────────────────────────────────────────────────────────────────

test('a comment belongs to the property under it, never to the one two members down', () => {
  // A lazy capture backtracks across the end of an earlier comment and hands one property another's
  // domain — silently, and only where a non-property member sits between the two.
  const source = `export class X {
  /** something else entirely, values: a|b */
  private helper = 1;
  @property() plain: string = '';
  /** state cmdState — actionStatus, values: idle|error */
  @property() cmdState: string = '';
}`;
  const properties = propertiesOf(source);
  assert.deepEqual(properties.map((item) => item.name), ['plain', 'cmdState']);
  assert.deepEqual(properties[0].valueSet, []);
  assert.deepEqual(properties[1].valueSet, ['idle', 'error']);
});

test('the comment and the property on ONE line are read too', () => {
  // `mls-102050/l2/controleChamados/web/shared/ticketCommentCatalogue.ts:43-44` puts both on the
  // same line — the same generator, minified output.
  const source = `/** state qryTicketPickerSortOrder — input, values: asc|desc */ @property() qryTicketPickerSortOrder: string = '';`;
  const [property] = propertiesOf(source);
  assert.equal(property.name, 'qryTicketPickerSortOrder');
  assert.deepEqual(property.valueSet, ['asc', 'desc']);
});

// ─── The rules that must not rot ────────────────────────────────────────────────────────────────

test('the reader is pure: no DOM, no stor, no network', () => {
  // D-013. A reader that reaches for a document is one the tests measure in a browser and nobody
  // measures against 58 pages.
  const source = readFileSync(new URL('scenarioL2.ts', import.meta.url), 'utf8');
  const code = source.split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .join('\n');
  for (const forbidden of ['document', 'window', 'fetch(', 'getContentByMlsPath', 'localStor', 'getState(']) {
    assert.equal(code.includes(forbidden), false, `${forbidden} has no business in the core`);
  }
  assert.equal(/^import\b/mu.test(code.replace(/^import type .*$/gmu, '')), false, 'the only import is a type');
});

test('no file of the l4 is read anywhere in this frontier any more', () => {
  // Criterion 9: not the workspace, not `operations/`, not `ontology/`. The panel reads two files
  // and both are the page's own.
  const service = readFileSync(new URL('../services/serviceScenario.ts', import.meta.url), 'utf8');
  for (const gone of ['/l4/', 'workspaces/', 'operations/', 'ontology/', 'parseWorkspace', 'vocabulary']) {
    assert.equal(service.includes(gone), false, `${gone} belongs to the reading that was dropped`);
  }
  assert.match(service, /web\/shared\/\$\{page\.shortName\}\.ts/u, 'the shared class');
  assert.match(service, /l2\/\$\{page\.folder\}\/\$\{page\.shortName\}\.ts/u, 'and the rendered variation');
  assert.match(service, /statesOfPage\(shared \?\? '', rendered \?\? ''\)/u);
});
