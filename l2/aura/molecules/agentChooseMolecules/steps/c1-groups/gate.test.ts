/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChGroupsInputs,
  buildChRegions,
  chDistinctGroups,
  normalizeChGroupsOutput,
  runChGroupsGate,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c1-groups/gate.js';

const KNOWN = ['groupSelectOne', 'groupEnterText', 'groupViewTable'];

function inputs(regions: Array<Partial<{ region: string; need: string; group: string; reason: string }>>): ChGroupsInputs {
  return {
    knownGroups: KNOWN,
    output: {
      regions: regions.map(region => ({
        region: region.region ?? 'campo',
        need: region.need ?? 'algo que o usuário preenche',
        group: region.group ?? 'groupEnterText',
        reason: region.reason ?? 'porque é texto livre',
      })),
    },
  };
}

function codes(errors: string[]): string[] {
  return errors.map(error => error.split(':')[0]);
}

void test('accepts a plain answer', () => {
  const gate = runChGroupsGate(inputs([{ region: 'nome' }, { region: 'CPF' }]));
  assert.equal(gate.ok, true);
  assert.deepEqual(gate.errors, []);
});

void test("'none' is an answer, not a failure", () => {
  const gate = runChGroupsGate(inputs([{ region: 'anexo', group: 'none', reason: 'precisa de upload de arquivo, que nenhum grupo publicado oferece' }]));
  assert.equal(gate.ok, true);
});

void test('a group the project does not publish is refused, and the message lists what exists', () => {
  const gate = runChGroupsGate(inputs([{ region: 'anexo', group: 'groupSelectFileForUpload' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['group_unknown']);
  assert.match(gate.errors[0], /groupSelectOne, groupEnterText, groupViewTable/);
});

void test('a case slip in the group name is not refused — the tag is where spelling is measured', () => {
  const gate = runChGroupsGate(inputs([{ region: 'nome', group: 'groupentertext' }]));
  assert.equal(gate.ok, true);
});

void test('two regions with the same name break the join and are refused', () => {
  const gate = runChGroupsGate(inputs([{ region: 'campo' }, { region: 'Campo' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['region_duplicated']);
});

void test('an empty answer is refused with the "none" way out in the message', () => {
  const gate = runChGroupsGate({ knownGroups: KNOWN, output: { regions: [] } });
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors), ['regions_empty']);
});

void test('the need line and the reason are both required', () => {
  const gate = runChGroupsGate(inputs([{ region: 'nome', need: '', reason: '' }]));
  assert.equal(gate.ok, false);
  assert.deepEqual(codes(gate.errors).sort(), ['need_missing', 'reason_missing']);
});

void test('normalize survives a payload with junk in the array', () => {
  const output = normalizeChGroupsOutput({ regions: [null, 'x', { region: ' nome ', need: 'n', group: 'g', reason: 'r' }] });
  assert.equal(output.regions.length, 1);
  assert.equal(output.regions[0].region, 'nome');
});

void test('the recorded regions carry the catalog spelling and null for the sentinel', () => {
  const output = normalizeChGroupsOutput({
    regions: [
      { region: 'nome', need: 'n', group: 'groupentertext', reason: 'r' },
      { region: 'grafico', need: 'n', group: 'none', reason: 'r' },
    ],
  });
  const regions = buildChRegions(output, KNOWN);
  assert.equal(regions[0].group, 'groupEnterText');
  assert.equal(regions[1].group, null);
});

void test('the fan-out list is distinct and keeps the order of first appearance', () => {
  const regions = buildChRegions(
    normalizeChGroupsOutput({
      regions: [
        { region: 'a', need: 'n', group: 'groupViewTable', reason: 'r' },
        { region: 'b', need: 'n', group: 'groupEnterText', reason: 'r' },
        { region: 'c', need: 'n', group: 'groupViewTable', reason: 'r' },
        { region: 'd', need: 'n', group: 'none', reason: 'r' },
      ],
    }),
    KNOWN,
  );
  assert.deepEqual(chDistinctGroups(regions), ['groupViewTable', 'groupEnterText']);
});
