/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c2-molecules/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChMoleculesInputs,
  buildChChoices,
  chTagIssueCodes,
  normalizeChMoleculesOutput,
  runChMoleculesGate,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c2-molecules/gate.js';

const TAGS = [
  'groupselectone--ml-card-selector',
  'groupselectone--ml-combobox',
  'groupselectone--ml-select-one-autocomplete',
];
const SCENARIOS = ['Long option list', 'Compare attributes'];
const REGIONS = ['plano', 'cidade'];

function inputs(choices: Array<Partial<{ region: string; group: string; tag: string; scenarioUsed: string; reason: string }>>): ChMoleculesInputs {
  return {
    group: 'groupSelectOne',
    regions: REGIONS,
    tags: TAGS,
    scenarios: SCENARIOS,
    output: {
      choices: choices.map(choice => ({
        region: choice.region ?? 'plano',
        group: choice.group ?? 'groupSelectOne',
        tag: choice.tag ?? TAGS[0],
        scenarioUsed: choice.scenarioUsed ?? 'none',
        reason: choice.reason ?? 'compara atributos de cada plano',
      })),
    },
  };
}

function codes(errors: string[]): string[] {
  return errors.map(error => error.split(':')[0]);
}

void test('accepts the published tags, spelled in full', () => {
  const gate = runChMoleculesGate(inputs([
    { region: 'plano', tag: TAGS[0] },
    { region: 'cidade', tag: TAGS[2], scenarioUsed: 'Long option list' },
  ]));
  assert.equal(gate.ok, true);
});

void test("tag 'none' is an answer — a numeric range belongs to another group", () => {
  const gate = runChMoleculesGate(inputs([
    { region: 'plano' },
    { region: 'cidade', tag: 'none', reason: 'precisaria de intervalo, que é de outro grupo' },
  ]));
  assert.equal(gate.ok, true);
});

void test('THE ANTI-INVENTION CHECK: a tag that does not exist is refused and the real ones are listed', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano', tag: 'groupselectone--ml-plan-picker' }, { region: 'cidade' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['tag_invented']);
  assert.match(gate.errors[0], /groupselectone--ml-card-selector/);
  assert.deepEqual(chTagIssueCodes(gate.errors), { invented: 1, short: 0, case: 0 });
});

void test('the short name is refused, never completed, and the full tag is named back', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano', tag: 'ml-card-selector' }, { region: 'cidade' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['tag_short']);
  assert.match(gate.errors[0], /groupselectone--ml-card-selector/);
  assert.deepEqual(chTagIssueCodes(gate.errors), { invented: 0, short: 1, case: 0 });
});

void test('a case slip is refused as its own finding, not as an invention', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano', tag: 'GroupSelectOne--ML-Card-Selector' }, { region: 'cidade' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['tag_case']);
  assert.deepEqual(chTagIssueCodes(gate.errors), { invented: 0, short: 0, case: 1 });
});

void test('a region that was not given cannot be joined and is refused', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano' }, { region: 'cidade' }, { region: 'bairro' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['region_unknown']);
});

void test('a region left unanswered is refused, with the "none" way out named', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['region_unanswered']);
  assert.match(gate.errors[0], /'none'/);
});

void test('answering the same region twice is refused', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano' }, { region: 'Plano' }, { region: 'cidade' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['region_duplicated']);
});

void test("a choice belonging to another group's call is refused", () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano', group: 'groupViewTable' }, { region: 'cidade' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['group_mismatch']);
});

void test('a scenario that is not a row of the table is refused; a row in any case is accepted', () => {
  const bad = runChMoleculesGate(inputs([{ region: 'plano', scenarioUsed: 'Escolha de plano' }, { region: 'cidade' }]));
  assert.deepEqual(codes(bad.errors), ['scenario_unknown']);

  const good = runChMoleculesGate(inputs([{ region: 'plano', scenarioUsed: 'compare attributes' }, { region: 'cidade' }]));
  assert.equal(good.ok, true);
});

void test('the reason is required, and the message says why it matters on none', () => {
  const gate = runChMoleculesGate(inputs([{ region: 'plano', tag: 'none', reason: '' }, { region: 'cidade' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['reason_missing']);
  assert.match(gate.errors[0], /whole answer/);
});

void test('an empty answer is refused', () => {
  const gate = runChMoleculesGate({ group: 'groupSelectOne', regions: REGIONS, tags: TAGS, scenarios: SCENARIOS, output: { choices: [] } });
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['choices_empty']);
});

void test('the recorded choices keep the given region spelling and null the sentinels', () => {
  const output = normalizeChMoleculesOutput({
    choices: [
      { region: 'PLANO', group: 'groupSelectOne', tag: TAGS[0], scenarioUsed: 'none', reason: 'r' },
      { region: 'cidade', group: 'groupSelectOne', tag: 'none', scenarioUsed: 'Long option list', reason: 'r' },
    ],
  });
  const choices = buildChChoices(output, { group: 'groupSelectOne', regions: REGIONS });
  assert.equal(choices[0].region, 'plano');
  assert.equal(choices[0].scenarioUsed, null);
  assert.equal(choices[1].tag, null);
  assert.equal(choices[1].scenarioUsed, 'Long option list');
});
