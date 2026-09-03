/// <mls fileReference="_102020_/l2/aura/agentManagePage2/pageContextCore.test.ts" enhancement="_blank" />

// Tests for the context digest of agentManagePage2. Fixtures mirror the real artifacts of
// mls-102046/buildFlowFsm/approveChangeOrder (l4 workspace, compiled shared .d.ts, page .ts) trimmed
// to what the digest actually reads.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFirstExportObject, digestWorkspace, digestFromPageDefs, parseSharedSurface, outlinePage,
  pageLocales, dsTokenNames, mapSectionsToMethods, buildPageEditContext, scopeVocabulary,
  partitionOperationsByScope,
} from '/_102020_/l2/aura/agentManagePage2/pageContextCore.js';
import type { EditOperation2 } from '/_102020_/l2/aura/agentManagePage2/patchCore.js';

const L4_WORKSPACE = `/// <mls fileReference="_102046_/l4/buildFlowFsm/workspaces/approveChangeOrder.defs.ts" enhancement="_blank"/>

export const approveChangeOrderWorkspace = {
  "workspaceId": "approveChangeOrder",
  "title": "Aprovar ordem de mudança",
  "actors": ["client"],
  "kind": "workflow",
  "entity": "ChangeOrder",
  "workflowId": "changeOrderLifecycle",
  "bffCalls": [
    {
      "bffId": "qryLocateChangeOrder",
      "kind": "query",
      "uses": [{ "operationId": "locateChangeOrder" }],
      "input": [],
      "output": {
        "kind": "list",
        "fields": [
          { "name": "changeOrderId", "from": "locateChangeOrder.$items.changeOrderId", "type": "string", "required": true },
          { "name": "changeAmount", "from": "locateChangeOrder.$items.changeAmount", "type": "number", "required": true },
          { "name": "forwardedForClientApprovalAt", "from": "x", "type": "string", "required": false }
        ]
      },
      "route": "buildFlowFsm.approveChangeOrder.qryLocateChangeOrder"
    },
    {
      "bffId": "cmdApproveChangeOrderDecision",
      "kind": "command",
      "input": [
        { "name": "changeOrderChangeOrderId", "from": "x", "required": true, "source": "selectedEntity", "type": "string" },
        { "name": "status", "from": "x", "required": true, "source": "userInput", "type": "string" }
      ],
      "output": { "kind": "object", "fields": [{ "name": "changeOrderId", "type": "string", "required": true }] },
      "route": "r"
    }
  ],
  "sections": [
    {
      "sectionId": "locateChangeOrder",
      "intent": "Uma ordem pendente está selecionada.",
      "organisms": [{ "role": "primarySurface", "dataSource": "qryLocateChangeOrder", "usage": "picker" }]
    },
    {
      "sectionId": "approveChangeOrderDecision",
      "intent": "A ordem fica registrada como aprovada.",
      "organisms": [{ "role": "primarySurface", "action": "cmdApproveChangeOrderDecision" }]
    },
    {
      "sectionId": "handoffApprovedChangeOrderToBilling",
      "intent": "O faturamento recebe a ordem.",
      "organisms": [{ "role": "contextualAction", "action": "cmdHandoffApprovedChangeOrderToBilling" }]
    }
  ],
  "purpose": "Decidir favoravelmente uma ordem de mudança.",
  "presentation": { "categoryRef": "approvalWorkflow", "confidence": 10 },
  "sliceHash": "sha256:5f16bab3"
} as const;

export default approveChangeOrderWorkspace;
`;

const SHARED_DTS = `import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
export type { QryLocateChangeOrderOutput } from '/_102046_/l2/buildFlowFsm/web/contracts/approveChangeOrder.js';
declare const message_pt: {
    'section.approveChangeOrder.locateChangeOrder.title': string;
    'intent.approveChangeOrder.qryLocateChangeOrder.list.empty': string;
};
export type MessageType = typeof message_pt;
export declare const messages: {
    [key: string]: MessageType;
};
export declare class BuildFlowFsmApproveChangeOrderBase extends CollabLitElement {
    /** state status — pageStatus */
    status: string;
    /** state qryLocateChangeOrderState — actionStatus, values: idle|loading|success|error */
    qryLocateChangeOrderState: 'idle' | 'loading' | 'success' | 'error';
    /** state qryLocateChangeOrderData — queryResult, outputShape: array */
    qryLocateChangeOrderData: QryLocateChangeOrderOutput[];
    /** state cmdApproveChangeOrderDecisionStatus — input */
    cmdApproveChangeOrderDecisionStatus: string;
    connectedCallback(): void;
    private initStateValue;
    private syncRouteParams;
    /** action qryLocateChangeOrder (query) — route r; inputs: (none) */
    loadQryLocateChangeOrder(): Promise<void>;
    /** handler for action qryLocateChangeOrder — bind UI events here */
    handleQryLocateChangeOrderClick(event?: Event): void;
    /** handler for action set.cmdApproveChangeOrderDecisionStatus — bind UI events here */
    handleCmdApproveChangeOrderDecisionStatusChange(event: Event): void;
}
`;

const PAGE = `/// <mls fileReference="_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BuildFlowFsmApproveChangeOrderBase, messages as sharedMessages, type MessageType } from '/_102046_/l2/buildFlowFsm/web/shared/approveChangeOrder.js';
const sharedFallback = sharedMessages[Object.keys(sharedMessages)[0]];
/// **collab_i18n_start**
const fromShared = (m: MessageType) => ({
'locate.empty': m['intent.approveChangeOrder.qryLocateChangeOrder.list.empty'],
});
const pageMessage_pt = {
...fromShared(sharedMessages['pt'] ?? sharedFallback),
'loading': 'Carregando…',
};
type PageMessageType = typeof pageMessage_pt;
const pageMessage_en: PageMessageType = {
...fromShared(sharedMessages['en'] ?? sharedFallback),
'loading': 'Loading…',
};
const pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt, 'en': pageMessage_en };
/// **collab_i18n_end**
const pageFallback = pageMessages[Object.keys(pageMessages)[0]];
@customElement('build-flow-fsm--web--desktop--page11--approve-change-order-102046')
export class BuildFlowFsmDesktopPage11ApproveChangeOrderPage extends BuildFlowFsmApproveChangeOrderBase {
protected get msg(): PageMessageType {
return pageFallback;
}
render() {
return html\`<main>\${this.renderLocateChangeOrder()}\${this.renderApproval()}\${this.renderBillingHandoff()}</main>\`;
}
renderLocateChangeOrder() {
const msg = this.msg;
const rows = this.qryLocateChangeOrderData;
return html\`<section>\${rows.length ? msg['locate.empty'] : msg['loading']}</section>\`;
}
renderApproval() {
const msg = this.msg;
return html\`<section><button @click=\${this.handleQryLocateChangeOrderClick}>\${msg['loading']}</button></section>\`;
}
renderBillingHandoff() {
return html\`<section></section>\`;
}
}
`;

const PAGE_DEFS = `/// <mls fileReference="_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs.ts" enhancement="_blank"/>

export const definition = {
  "pageId": "approveChangeOrder",
  "pageName": "Aprovar ordem de mudança",
  "baseClassName": "BuildFlowFsmApproveChangeOrderBase",
  "actor": "client",
  "purpose": "Decidir favoravelmente uma ordem de mudança recebida.",
  "presentation": { "categoryRef": "approvalWorkflow" },
  "dataBindings": [
    {
      "id": "binding.approveChangeOrder.qryLocateChangeOrder",
      "source": "bff.qryLocateChangeOrder",
      "command": "qryLocateChangeOrder",
      "description": "Localizar a ordem",
      "kind": "query",
      "inputStateKeys": [],
      "inputs": []
    },
    {
      "id": "binding.approveChangeOrder.cmdApproveChangeOrderDecision",
      "command": "cmdApproveChangeOrderDecision",
      "kind": "command",
      "inputs": [
        { "name": "status", "stateKey": "k", "source": "userInput", "required": true, "presentation": "form" }
      ]
    }
  ]
};

export const pipeline = [{ "id": "x", "type": "l2_page" }] as const;
`;

// ─── l4 digest ──────────────────────────────────────────────────────────────

test('parseFirstExportObject reads a generated l4 defs, `as const` and all', () => {
  const parsed = parseFirstExportObject(L4_WORKSPACE)!;
  assert.equal(parsed.workspaceId, 'approveChangeOrder');
  assert.equal(parseFirstExportObject('export const x = 1;'), null);
});

test('digestWorkspace keeps decisions and drops wiring', () => {
  const digest = digestWorkspace(L4_WORKSPACE)!;
  assert.equal(digest.source, 'l4-workspace');
  assert.equal(digest.purpose, 'Decidir favoravelmente uma ordem de mudança.');
  assert.deepEqual(digest.actors, ['client']);
  assert.equal(digest.entity, 'ChangeOrder');
  assert.equal(digest.presentation, 'approvalWorkflow');
  assert.equal(digest.sections.length, 3);
  assert.equal(digest.sections[0].organisms[0].dataSource, 'qryLocateChangeOrder');

  assert.equal(digest.data.length, 2);
  const query = digest.data[0];
  assert.equal(query.kind, 'query');
  assert.equal(query.output.kind, 'list');
  assert.deepEqual(query.output.fields.map(f => f.name), ['changeOrderId', 'changeAmount', 'forwardedForClientApprovalAt']);
  assert.equal(query.output.fields[1].type, 'number');
  assert.equal(query.output.fields[2].required, false);
  const command = digest.data[1];
  assert.deepEqual(command.inputs.map(i => `${i.name}:${i.source}`), ['changeOrderChangeOrderId:selectedEntity', 'status:userInput']);
  // wiring is gone
  assert.ok(!JSON.stringify(digest).includes('sliceHash'));
  assert.ok(!JSON.stringify(digest).includes('locateChangeOrder.$items'));
  assert.ok(!JSON.stringify(digest).includes('buildFlowFsm.approveChangeOrder.qryLocateChangeOrder'));
});

test('digestWorkspace refuses a file that is not a workspace', () => {
  assert.equal(digestWorkspace('export const x = { "a": 1 };'), null);
  assert.equal(digestWorkspace('not a defs'), null);
});

test('digestFromPageDefs is the fallback when l4 is unavailable', () => {
  const digest = digestFromPageDefs(PAGE_DEFS)!;
  assert.equal(digest.source, 'page-defs');
  assert.deepEqual(digest.actors, ['client']);
  assert.equal(digest.sections.length, 0);
  assert.deepEqual(digest.data.map(d => `${d.bffId}:${d.kind}`), ['qryLocateChangeOrder:query', 'cmdApproveChangeOrderDecision:command']);
  assert.equal(digest.data[0].output.kind, 'unknown');   // the page defs does not know the fields
  assert.equal(digest.data[1].inputs[0].name, 'status');
});

// ─── shared surface ─────────────────────────────────────────────────────────

test('parseSharedSurface reads states, handlers, members and msg keys from the .d.ts', () => {
  const surface = parseSharedSurface(SHARED_DTS);
  assert.deepEqual(surface.states.map(s => s.name), ['status', 'qryLocateChangeOrderState', 'qryLocateChangeOrderData', 'cmdApproveChangeOrderDecisionStatus']);
  assert.equal(surface.states[1].kind, 'actionStatus, values: idle|loading|success|error');
  assert.deepEqual(surface.handlers, ['handleCmdApproveChangeOrderDecisionStatusChange', 'handleQryLocateChangeOrderClick']);
  assert.ok(surface.members.has('qryLocateChangeOrderData'));
  assert.ok(surface.members.has('loadQryLocateChangeOrder'));
  assert.ok(surface.msgKeys.has('intent.approveChangeOrder.qryLocateChangeOrder.list.empty'));
});

test('parseSharedSurface never exposes private members', () => {
  const surface = parseSharedSurface(SHARED_DTS);
  assert.ok(!surface.members.has('initStateValue'));
  assert.ok(!surface.members.has('syncRouteParams'));
});

test('parseSharedSurface also works on a raw .ts base class', () => {
  const raw = `export class Base extends CollabLitElement {
  /** state qryXData — queryResult, outputShape: array */
  @property() qryXData: XOutput[] = [];
  handleQryXClick(event?: Event): void {
  }
}`;
  const surface = parseSharedSurface(raw);
  assert.deepEqual(surface.states.map(s => s.name), ['qryXData']);
  assert.ok(surface.members.has('qryXData'));
  assert.deepEqual(surface.handlers, ['handleQryXClick']);
});

// ─── the page file ──────────────────────────────────────────────────────────

test('outlinePage maps each render method to what it references', () => {
  const outline = outlinePage(PAGE);
  assert.deepEqual(outline.map(o => o.method), ['render', 'renderLocateChangeOrder', 'renderApproval', 'renderBillingHandoff']);
  const locate = outline[1];
  assert.deepEqual(locate.msgKeys.sort(), ['loading', 'locate.empty']);
  assert.deepEqual(locate.members, ['msg', 'qryLocateChangeOrderData']);
  assert.ok(locate.lines >= 4);
  assert.deepEqual(outline[3].msgKeys, []);
  assert.ok(!outline.some(o => o.method === 'msg'));   // the getter is not part of the screen
});

test('pageLocales reads the locale set from the file, not from l4', () => {
  assert.deepEqual(pageLocales(PAGE), ['pt', 'en']);
});

test('dsTokenNames turns design tokens into CSS variable names', () => {
  const ds = `export const designSystem = { "tokens": { "page-bg": "#fff", "text-strong": "#000", "themename": "x", "description": "y" } };`;
  const tokens = dsTokenNames(ds);
  assert.ok(tokens.has('--page-bg'));
  assert.ok(tokens.has('--text-strong'));
  assert.ok(!tokens.has('--themename'));
  assert.equal(tokens.size, 2);
});

// ─── section ⇄ method ───────────────────────────────────────────────────────

test('mapSectionsToMethods matches by name, then positionally', () => {
  const digest = digestWorkspace(L4_WORKSPACE)!;
  const mapped = mapSectionsToMethods(digest.sections, outlinePage(PAGE));
  assert.equal(mapped[0].method, 'renderLocateChangeOrder');   // by name
  assert.equal(mapped[1].method, 'renderApproval');            // positional leftover
  assert.equal(mapped[2].method, 'renderBillingHandoff');
  // the input list is not mutated
  assert.equal(digest.sections[0].method, undefined);
});

test('mapSectionsToMethods leaves sections unmapped when there are fewer methods', () => {
  const digest = digestWorkspace(L4_WORKSPACE)!;
  const mapped = mapSectionsToMethods(digest.sections, [{ method: 'render', msgKeys: [], members: [], lines: 1 }]);
  assert.equal(mapped.filter(s => s.method).length, 0);
});

// ─── assembly ───────────────────────────────────────────────────────────────

test('buildPageEditContext prefers l4 and reports what it used', () => {
  const context = buildPageEditContext({
    page: 'approveChangeOrder', module: 'buildFlowFsm',
    l4WorkspaceSrc: L4_WORKSPACE, defsSrc: PAGE_DEFS, pageSrc: PAGE, sharedSrc: SHARED_DTS,
    userChanges: [],
  });
  assert.equal(context.contextSource, 'l4-workspace');
  assert.equal(context.canAddText, true);
  assert.deepEqual(context.languages, ['pt', 'en']);
  assert.equal(context.sections.length, 3);
  assert.equal(context.sections[0].method, 'renderLocateChangeOrder');
  assert.equal(context.data[0].output.fields.length, 3);
  assert.equal(context.surface.states.length, 4);
  assert.ok(context.pageMsgKeys.includes('loading'));
  assert.deepEqual(scopeVocabulary(context), ['page', 'render', 'renderLocateChangeOrder', 'renderApproval', 'renderBillingHandoff']);
});

test('buildPageEditContext degrades to the page defs when l4 is missing', () => {
  const context = buildPageEditContext({
    page: 'approveChangeOrder', module: 'buildFlowFsm',
    l4WorkspaceSrc: null, defsSrc: PAGE_DEFS, pageSrc: PAGE, sharedSrc: SHARED_DTS,
    userChanges: [{ id: 'uc1', change: 'align left', scope: 'renderApproval', intent: 'layout.align', user: 'u', date: 'd' }],
  });
  assert.equal(context.contextSource, 'page-defs');
  assert.equal(context.sections.length, 0);
  assert.equal(context.data.length, 2);
  assert.equal(context.userChanges.length, 1);
});

test('buildPageEditContext flags a page that cannot receive new text', () => {
  const legacy = PAGE.replace('/// **collab_i18n_start**', '').replace('/// **collab_i18n_end**', '');
  const context = buildPageEditContext({
    page: 'p', module: 'm', defsSrc: PAGE_DEFS, pageSrc: legacy, sharedSrc: SHARED_DTS, userChanges: [],
  });
  assert.equal(context.canAddText, false);
});

test('partitionOperationsByScope isolates a scope this page does not own', () => {
  const context = buildPageEditContext({
    page: 'p', module: 'm', l4WorkspaceSrc: L4_WORKSPACE, defsSrc: PAGE_DEFS, pageSrc: PAGE, sharedSrc: SHARED_DTS, userChanges: [],
  });
  const ops: EditOperation2[] = [
    { kind: 'layout', scope: 'renderApproval', target: '', description: 'align left' },
    { kind: 'layout', scope: 'renderElsewhere', target: '', description: 'move it' },
  ];
  const { valid, unknown } = partitionOperationsByScope(ops, context);
  assert.equal(valid.length, 1);
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].scope, 'renderElsewhere');
});
