/// <mls fileReference="_102020_/l2/aura/helpers/scenarioCore.test.ts" enhancement="_blank"/>
// What is left of the core after the l4 stopped being the source (D-016, D-017): the shape of a
// state, the grouping by action, and the guards on the panel that reads them.
//
// The reading itself — the four generator forms, the domain, the pairing — is tested in
// `scenarioL2.test.ts`, against verbatim slices of real generated pages.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { groupByAction, type IScenarioState } from '/_102020_/l2/aura/helpers/scenarioCore.js';
import { statesOfPage } from '/_102020_/l2/aura/helpers/scenarioL2.js';

const TAB = readFileSync(new URL('../plugins/pluginPageStates.ts', import.meta.url), 'utf8');

/**
 * A real page, trimmed: `mls-102050/l2/controleChamados/web/shared/ticketHub.ts`, two actions so the
 * grouping has something to split.
 */
const TICKET_HUB = `const SUBSCRIBED_STATE_KEYS: string[] = [
'ui.ticketHub.status',
'ui.ticketHub.scenary',
'ui.ticketHub.action.qryListTicket.status',
'ui.ticketHub.input.qryListTicket.sortBy',
'ui.ticketHub.data.qryListTicket',
'ui.ticketHub.action.cmdCreateTicket.status',
'ui.ticketHub.action.cmdCreateTicket.error',
];
export class ControleChamadosTicketHubBase extends CollabLitElement {
/** state status — pageStatus */
@property() status: string = '';
/** state ui.ticketHub.scenary — uiScenary, values: base|detail */
@property() uiScenary: 'base' | 'detail' = 'base';
/** state qryListTicketState — actionStatus, values: idle|loading|success|error */
@property() qryListTicketState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state qryListTicketSortBy — input, values: open|closed */
@property() qryListTicketSortBy: string = '';
/** state qryListTicketData — queryResult, outputShape: array */
@property() qryListTicketData: QryListTicketOutput[] = [];
/** state cmdCreateTicketState — actionStatus, values: idle|loading|success|error */
@property() cmdCreateTicketState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
/** state cmdCreateTicketError — actionError */
@property() cmdCreateTicketError: string = '';
}`;

const states = statesOfPage(TICKET_HUB, '');

test('each state carries what a control needs to be drawn', () => {
  const sortBy = states.find((item) => item.key.endsWith('.sortBy')) as IScenarioState;
  assert.equal(sortBy.name, 'qryListTicketSortBy', 'the property the control is bound to');
  assert.equal(sortBy.kind, 'input');
  assert.equal(sortBy.bffId, 'qryListTicket');
  assert.equal(sortBy.field, 'sortBy', 'and the input own name, which is not the property');
  assert.deepEqual(sortBy.valueSet, ['open', 'closed']);
  assert.equal(sortBy.editable, true);
});

test('the lines are split into the actions they belong to', () => {
  // What makes a technical line honest: `cmdCreateTicketState` and `qryListTicketState` are both
  // "situation", and only the action around them tells them apart.
  const blocks = groupByAction(states);
  assert.deepEqual(blocks.map((block) => block.bffId), [null, 'qryListTicket', 'cmdCreateTicket']);
  // The page's own states stand alone in the first block.
  assert.deepEqual(blocks[0].states.map((item) => item.kind), ['pageStatus', 'scene']);
  // Nothing is lost or duplicated by the split.
  assert.equal(blocks.reduce((total, block) => total + block.states.length, 0), states.length);
});

test('an action that appeared twice stays two blocks instead of merging', () => {
  // Run-length, not a bucket sort: a silent merge would hide that the inventory came out wrong.
  const twice: IScenarioState[] = [
    { key: 'a', name: 'a', kind: 'actionStatus', bffId: 'cmd', editable: true },
    { key: 'b', name: 'b', kind: 'actionStatus', bffId: 'qry', editable: true },
    { key: 'c', name: 'c', kind: 'actionStatus', bffId: 'cmd', editable: true },
  ];
  assert.deepEqual(groupByAction(twice).map((block) => block.bffId), ['cmd', 'qry', 'cmd']);
});

test('only the closed domains are editable', () => {
  // D-017: of the 7 states of this page 3 have a domain (the scene, and the two action statuses) and 4 do not.
  assert.deepEqual(states.filter((item) => item.editable).map((item) => item.name),
    ['uiScenary', 'qryListTicketState', 'qryListTicketSortBy', 'cmdCreateTicketState']);
  assert.equal(states.filter((item) => !item.editable).length, 3);
});

// ── Guards on the Studio "States" tab (plugins/pluginPageStates), which replaced the Scenario service ─────────────

test('restoring puts back what the APP had, not the previous simulation', () => {
  // The original is captured once. Overwriting it on the second change would make "restore" put back
  // the first simulated value — which no one ever asked for.
  const write = TAB.slice(TAB.indexOf('private _write('));
  const body = write.slice(0, write.indexOf('\n  }'));
  assert.match(body, /existing \? existing\.original : getState\(key\)/u);
});

test('what the tab publishes is plain data: the simulated keys', () => {
  // Same discipline as `aura.edit`: `setState` keeps every value it is handed in a 10.000-entry log,
  // so anything live parked there is pinned for the session.
  assert.match(TAB, /setState\('aura\.scenario\.simulated', \[\.\.\.this\._simulated\.keys\(\)\]\)/u);
});

test('the tab reads the page own files, and a load that lost the race does not write', () => {
  assert.match(TAB, /web\/shared\/\$\{page\.shortName\}\.defs\.js/u, 'the shared defs');
  assert.match(TAB, /l2\/\$\{page\.folder\}\/\$\{page\.shortName\}\.ts/u, 'and the rendered variation, for the scenes');
  const load = TAB.slice(TAB.indexOf('private async _load('), TAB.indexOf('// ─── Simulating'));
  assert.ok((load.match(/token !== this\._loadToken/gu) ?? []).length >= 1, 'the await is fenced');
  for (const gone of ['/l4/', 'workspaces/', 'operations/', 'ontology/']) {
    assert.equal(TAB.includes(gone), false, `${gone} is not the page's`);
  }
});

test('every message of the tab exists in the three languages', () => {
  const i18n = TAB.slice(TAB.indexOf('/// **collab_i18n_start**'), TAB.indexOf('/// **collab_i18n_end**'));
  const keys = [...i18n.slice(0, i18n.indexOf('};')).matchAll(/^\s{2}(\w+):/gmu)].map((match) => match[1]);
  assert.ok(keys.length > 10);
  for (const key of keys) {
    assert.equal((i18n.match(new RegExp(`^\\s+${key}:`, 'gmu')) ?? []).length, 3, `${key} in en, pt and es`);
  }
});

test('the core no longer knows what an l4 file looks like', () => {
  // Criterion 12: the header used to argue for the l4, and a comment that lies is worse than none.
  // The interfaces, the parsers and the vocabulary went with it.
  const CORE = readFileSync(new URL('scenarioCore.ts', import.meta.url), 'utf8');
  for (const gone of ['IWorkspace', 'IOntology', 'parseDefsObject', 'scenarioKeys', 'groupBySection',
    'describeState', 'describeAction', 'inputsWithoutWriter', 'ACTION_STATUS_VALUES', 'enumValues',
    'NO_VOCABULARY', 'fieldRef']) {
    assert.equal(CORE.includes(gone), false, `${gone} belonged to the l4 reading`);
  }
  assert.match(CORE, /WHY THE L2 AND NOT THE L4/u, 'and the header says which way round it is now');
});
