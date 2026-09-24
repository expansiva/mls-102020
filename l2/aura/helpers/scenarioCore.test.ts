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

const SERVICE = readFileSync(new URL('../services/serviceScenario.ts', import.meta.url), 'utf8');

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

test('the panel offers the closed domains and counts the rest', () => {
  // D-017: the list IS "what can be simulated". Of the 7 states of this page 3 have a domain
  // (the scene, and the two action statuses) and 4 do not.
  assert.deepEqual(states.filter((item) => item.editable).map((item) => item.name),
    ['uiScenary', 'qryListTicketState', 'qryListTicketSortBy', 'cmdCreateTicketState']);
  assert.equal(states.filter((item) => !item.editable).length, 3);

  assert.match(SERVICE, /states\.filter\(\(item\) => !item\.editable\)\.length/u, 'the hidden ones are counted');
  assert.match(SERVICE, /groupByAction\(states\.filter\(\(item\) => item\.editable\)\)/u, 'and only the rest is listed');
  assert.match(SERVICE, /\$\{this\._hidden\} \$\{this\.msg\.hidden\}/u, 'and the count is on screen');
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
  assert.match(SERVICE, /setState\('aura\.scenario\.simulated', \[\.\.\.this\._simulated\.keys\(\)\]\)/u);
});

test('the panel reads the page, and it reads BOTH of its files', () => {
  // D-016. The shared class carries the properties, their types and the comments; a variation can
  // name keys the shared one does not. One of the two is half an inventory.
  assert.match(SERVICE, /web\/shared\/\$\{page\.shortName\}\.ts/u);
  assert.match(SERVICE, /l2\/\$\{page\.folder\}\/\$\{page\.shortName\}\.ts/u);
  assert.match(SERVICE, /Promise\.all\(/u, 'and they are read together');
  // A load that lost the race must not write: the inventory of one page on the screen of another is
  // a wrong list with no way for the user to tell.
  const load = SERVICE.slice(SERVICE.indexOf('private async _load('), SERVICE.indexOf('// ─── Simulating'));
  assert.ok((load.match(/token !== this\._loadToken/gu) ?? []).length >= 1, 'the await is fenced');
});

test('the phrase about the l4 workspace is gone from all three languages', () => {
  // Criterion 10. 12 of the 58 pages used to get it and then an empty panel; there is no page the
  // reader cannot reach any more, so the sentence would now only ever be wrong.
  for (const gone of ['workspace', 'noWorkspace', 'needsFixture', 'noWriter']) {
    assert.equal(SERVICE.includes(gone), false, `"${gone}" outlived what it described`);
  }
  // And the footnote that replaces it exists in en, pt and es.
  for (const key of ['hidden', 'noStates']) {
    assert.equal((SERVICE.match(new RegExp(`\\b${key}:`, 'gu')) ?? []).length, 3, `${key} in en, pt and es`);
  }
});

test('every species has a word, in all three languages', () => {
  // The line is composed at runtime from `ScenarioKind`, so an id the catalog never heard of renders
  // as nothing at all. The compiler holds the map total; this holds the three languages.
  const CORE = readFileSync(new URL('scenarioCore.ts', import.meta.url), 'utf8');
  const kinds = [...CORE.matchAll(/^\s*\|\s*'(\w+)'/gmu)].map((match) => match[1]);
  assert.deepEqual(kinds.sort(), ['actionError', 'actionStatus', 'commandOutput', 'input', 'other',
    'pageStatus', 'queryResult', 'scene']);
  for (const kind of kinds) {
    assert.match(SERVICE, new RegExp(`${kind}: '(\\w+)'`, 'u'), `${kind} has a role word`);
  }
  for (const role of ['rolePageStatus', 'roleStatus', 'roleError', 'roleInput', 'roleResult',
    'roleOutput', 'roleScene', 'roleOther']) {
    assert.equal((SERVICE.match(new RegExp(`\\b${role}:`, 'gu')) ?? []).length, 3,
      `${role} in en, pt and es`);
    assert.match(SERVICE, new RegExp(`: '${role}'`, 'u'), `${role} is reachable from a species`);
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
