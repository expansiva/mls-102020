/// <mls fileReference="_102020_/l2/aura/helpers/scenarioCore.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ACTION_STATUS_VALUES,
  groupBySection,
  inputsWithoutWriter,
  parseWorkspace,
  scenarioKeys,
} from '/_102020_/l2/aura/helpers/scenarioCore.js';

/**
 * A real workspace, trimmed to what these tests need — the shape is exactly the l4 one.
 *
 * `cmdDeleteChangeOrder.changeOrderId` is `selectedEntity` with NO `sourceRef`: nothing is named to
 * select it, which is why the delete button of the real page is disabled forever.
 */
const WORKSPACE = `export const changeOrderCatalogueWorkspace = ${JSON.stringify({
  workspaceId: 'changeOrderCatalogue',
  title: 'Ordem de mudança',
  entity: 'ChangeOrder',
  bffCalls: [
    { bffId: 'qryListChangeOrder', kind: 'query', input: [], output: { kind: 'list', fields: [{ name: 'changeOrderId', type: 'string' }] } },
    {
      bffId: 'cmdUpdateChangeOrder',
      kind: 'command',
      input: [
        { name: 'changeOrderId', type: 'string', required: true, source: 'selectedEntity' },
        { name: 'clientRef', type: 'string', required: true, source: 'selectedEntity', sourceRef: 'qryClientPicker' },
        { name: 'description', type: 'string', required: true, source: 'userInput' },
        { name: 'status', type: 'string', required: true, source: 'systemDefault' },
      ],
      output: { kind: 'object', fields: [{ name: 'changeOrderId', type: 'string' }] },
    },
    {
      bffId: 'cmdDeleteChangeOrder',
      kind: 'command',
      input: [{ name: 'changeOrderId', type: 'string', required: true, source: 'selectedEntity' }],
      output: { kind: 'object', fields: [] },
    },
  ],
  sections: [
    {
      sectionId: 'recordList',
      intent: 'Localizar Ordem de mudança.',
      organisms: [
        { role: 'primarySurface', dataSource: 'qryListChangeOrder' },
        { role: 'contextualAction', action: 'cmdDeleteChangeOrder' },
      ],
    },
    {
      sectionId: 'recordForm',
      intent: 'Criar ou corrigir Ordem de mudança.',
      organisms: [{ role: 'primarySurface', action: 'cmdUpdateChangeOrder' }],
    },
  ],
}, null, 1)};`;

const workspace = parseWorkspace(WORKSPACE);

test('the workspace is read, not evaluated', () => {
  // The object is plain JSON in all 34 real files, so reading one must not run anything.
  assert.ok(workspace);
  assert.equal(workspace.workspaceId, 'changeOrderCatalogue');
  assert.equal(workspace.bffCalls?.length, 3);

  assert.equal(parseWorkspace('export const x = 1;'), null, 'no object, no workspace');
  assert.equal(parseWorkspace('export const x = { notAWorkspace: true };'), null, 'no workspaceId');
  assert.equal(parseWorkspace('export const x = { broken: '), null, 'unparseable is null, not a throw');
});

test('the six key shapes come out of the workspace', () => {
  assert.ok(workspace);
  const keys = scenarioKeys(workspace).map((state) => state.key);

  // The convention, verified against all 34 real pages before this file existed: derived from the l4
  // vs what each page subscribes to, 34/34 match exactly.
  assert.ok(keys.includes('ui.changeOrderCatalogue.status'));
  assert.ok(keys.includes('ui.changeOrderCatalogue.action.qryListChangeOrder.status'));
  assert.ok(keys.includes('ui.changeOrderCatalogue.data.qryListChangeOrder'), 'a query has data');
  assert.ok(keys.includes('ui.changeOrderCatalogue.output.cmdDeleteChangeOrder'), 'a command has output');
  assert.ok(keys.includes('ui.changeOrderCatalogue.action.cmdDeleteChangeOrder.error'), 'and an error');
  assert.ok(keys.includes('ui.changeOrderCatalogue.input.cmdUpdateChangeOrder.clientRef'));

  // A query has no error key and no output key: that is what the l2 subscription says too.
  assert.equal(keys.includes('ui.changeOrderCatalogue.action.qryListChangeOrder.error'), false);
  assert.equal(keys.includes('ui.changeOrderCatalogue.output.qryListChangeOrder'), false);
});

test('each state carries what a control needs to be drawn', () => {
  assert.ok(workspace);
  const states = scenarioKeys(workspace);
  const byKey = new Map(states.map((state) => [state.key, state]));

  const status = byKey.get('ui.changeOrderCatalogue.action.cmdDeleteChangeOrder.status');
  assert.deepEqual(status?.valueSet, ACTION_STATUS_VALUES, 'a closed domain of four');
  assert.equal(status?.editable, true);
  assert.equal(status?.name, 'cmdDeleteChangeOrderState', 'the property the page renders from');

  const input = byKey.get('ui.changeOrderCatalogue.input.cmdUpdateChangeOrder.clientRef');
  assert.equal(input?.name, 'cmdUpdateChangeOrderClientRef');
  assert.equal(input?.source, 'selectedEntity');
  assert.equal(input?.sourceRef, 'qryClientPicker');
  assert.equal(input?.editable, true);

  // The page status has no declared domain — not in the l4 and not in the l2 defs either. A free
  // field is honest; an invented enum would offer values the page never compares against.
  assert.equal(byKey.get('ui.changeOrderCatalogue.status')?.valueSet, undefined);

  // Phase 1 cannot offer a list or an object honestly, but it must not hide them: a state the panel
  // hides is a state the user believes does not exist.
  assert.equal(byKey.get('ui.changeOrderCatalogue.data.qryListChangeOrder')?.editable, false);
  assert.equal(byKey.get('ui.changeOrderCatalogue.output.cmdUpdateChangeOrder')?.editable, false);
});

test('the states are grouped by the page own sections, and nothing is dropped', () => {
  assert.ok(workspace);
  const states = scenarioKeys(workspace);
  const groups = groupBySection(workspace, states);

  const total = groups.reduce((sum, group) => sum + group.states.length, 0);
  assert.equal(total, states.length, 'every state lands in exactly one group');

  const list = groups.find((group) => group.sectionId === 'recordList');
  assert.match(list?.intent ?? '', /Localizar/u);
  const listBffs = new Set(list?.states.map((state) => state.bffId));
  assert.deepEqual([...listBffs].sort(), ['cmdDeleteChangeOrder', 'qryListChangeOrder']);

  // The page's own status belongs to no section: it goes last, in the leftover group.
  const leftover = groups[groups.length - 1];
  assert.equal(leftover.sectionId, '');
  assert.deepEqual(leftover.states.map((state) => state.key), ['ui.changeOrderCatalogue.status']);
});

test('an input nothing on screen fills is reported — and one that IS filled is not', () => {
  assert.ok(workspace);
  const states = scenarioKeys(workspace);

  // The real layout 1: a select for the update id, text inputs for what the user types, and no
  // control at all for the delete id or for clientRef.
  const layout1 = `
    <select .value=\${this.cmdUpdateChangeOrderChangeOrderId} @change=\${this.handleCmdUpdateChangeOrderChangeOrderIdChange}></select>
    <input .value=\${this.cmdUpdateChangeOrderDescription} @input=\${this.handleCmdUpdateChangeOrderDescriptionChange}>
    <button ?disabled=\${!this.cmdDeleteChangeOrderChangeOrderId}>delete</button>
  `;
  const missing = inputsWithoutWriter(states, layout1).map((state) => state.name);
  assert.deepEqual(missing.sort(), ['cmdDeleteChangeOrderChangeOrderId', 'cmdUpdateChangeOrderClientRef']);

  // `systemDefault` is filled by the app by design: flagging it would be noise.
  assert.equal(missing.includes('cmdUpdateChangeOrderStatus'), false);

  // The real layouts 2 and 3 fill the same inputs from a clickable ROW, by calling the generated
  // setters. Without counting that shape the detector cried wolf 74 times instead of 43.
  const layout2 = `
    <button @click=\${() => { this.setCmdUpdateChangeOrderClientRef(String(r['clientRef'])); this.setCmdDeleteChangeOrderChangeOrderId(id); }}></button>
    <input .value=\${this.cmdUpdateChangeOrderDescription}>
  `;
  assert.deepEqual(inputsWithoutWriter(states, layout2).map((state) => state.name), ['cmdUpdateChangeOrderChangeOrderId']);
});

// --- The panel that uses it (source-level guards) ---

const SERVICE = readFileSync(new URL('../services/serviceScenario.ts', import.meta.url), 'utf8');

test('the panel reads the L4, never the l2 defs', () => {
  // The l2 `.defs.ts` is generator output and may change shape or go away; the l4 workspace is the
  // source, and the derivation from it was measured exact on all 34 pages.
  assert.match(SERVICE, /l4\/\$\{module\}\/workspaces\/\$\{page\.shortName\}\.defs\.ts/u);
  assert.equal(/l2\/.*web.*shared.*defs/u.test(SERVICE), false, 'no l2 defs anywhere');
  // And it refuses honestly where there is no workspace instead of guessing.
  assert.match(SERVICE, /_missingWorkspace = true/u);
});

test('restoring puts back what the APP had, not the previous simulation', () => {
  // The original is captured once. Overwriting it on the second change would make "restore" put back
  // the first simulated value — which no one ever asked for.
  const apply = SERVICE.slice(SERVICE.indexOf('private _apply('));
  const body = apply.slice(0, apply.indexOf('\n  }'));
  assert.match(body, /existing \? existing\.original : getState\(state\.key\)/u);
});

test('the simulation is announced outside the panel', () => {
  // Two message <p>s look identical: editing the error branch believing it is the success one is the
  // mistake this makes easy, and the picker is where the user is looking when they make it.
  assert.match(SERVICE, /setState\('aura\.scenario\.simulated', \[\.\.\.this\._simulated\.keys\(\)\]\)/u);

  const panel = readFileSync(new URL('../studio/classPickerPanel.ts', import.meta.url), 'utf8');
  assert.match(panel, /subscribe\(ClassPickerPanel\.SCENARIO_KEY, this\)/u, 'the picker listens');
  assert.match(panel, /unsubscribe\(ClassPickerPanel\.SCENARIO_KEY, this\)/u, 'and stops listening');
  assert.match(panel, /renderScenarioBadge/u);
});

test('what the panel publishes is plain data', () => {
  // Same discipline as `aura.edit`: `setState` keeps every value it is handed in a 10.000-entry log,
  // so anything live parked there is pinned for the session.
  const keys = ['ui.page.action.cmd.status', 'ui.page.input.cmd.field'];
  assert.deepEqual(JSON.parse(JSON.stringify(keys)), keys);
  // The published value is exactly a list of keys — strings, built from a Map's keys.
  assert.match(SERVICE, /setState\('aura\.scenario\.simulated', \[\.\.\.this\._simulated\.keys\(\)\]\)/u);
});
