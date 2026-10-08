/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { describeEffort, describeEffortFrom } from '/_102020_/l2/helpers/effort/describeEffort.js';
import type { EffortInput, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

const FIXTURE = new URL('./fixtures/agendaClinica/contracts/', import.meta.url);
const GOLDEN = new URL('../../../../mls-102035/l2/solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url);

function contracts(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(FIXTURE)) {
    if (!name.endsWith('.defs.txt')) continue;
    out[name.slice(0, -'.defs.txt'.length)] = readFileSync(new URL(name, FIXTURE), 'utf8');
  }
  return out;
}

function input(item: Pick<L4DiffItem, 'changeId' | 'kind' | 'op' | 'entity'>): EffortInput {
  return {
    module: 'agendaClinica',
    base: { baseId: 'mls-102047', revisionId: 'cc1b2e6' },
    item: { ...item, source: 'l4/agendaClinica/rules.defs.ts' },
  };
}

void test('rule changed cites only the pages whose routes list the id', () => {
  const pages = contracts();
  const note = describeEffortFrom(input({
    changeId: 'rule:anotacaoObrigatoriaNoAtendimento', kind: 'rule', op: 'changed', entity: '',
  }), pages);
  assert.equal(note.status, 'computed');
  assert.deepEqual(note.materialize, [{
    kind: 'page', id: 'agenda_diaria', path: 'l2/agendaClinica/web/contracts/agenda_diaria.defs.ts',
  }]);
  assert.deepEqual(note.regenerateDefs, []);
  assert.deepEqual(note.runAgents, []);
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as {
    perItem: Array<{ answers: Array<{ master: { kind: string }; materialize: Array<{ kind: string; id: string }> }> }>;
  };
  const l2 = golden.perItem[0].answers.find(row => row.master.kind === 'l2');
  assert.deepEqual(note.materialize.map(unit => ({ kind: unit.kind, id: unit.id })), l2?.materialize.map(unit => ({ kind: unit.kind, id: unit.id })));

  const conflict = describeEffortFrom(input({
    changeId: 'rule:consultaSemConflito', kind: 'rule', op: 'changed', entity: '',
  }), pages);
  assert.equal(conflict.status, 'computed');
  assert.deepEqual(conflict.materialize.map(unit => unit.id), ['consultas']);
});

void test('a rule no route cites, other kinds, and a module without contracts abend', () => {
  const pages = contracts();
  const missing = describeEffortFrom(input({
    changeId: 'rule:naoExiste', kind: 'rule', op: 'changed', entity: '',
  }), pages);
  assert.equal(missing.status, 'abend');
  assert.equal(missing.abend?.reason, 'no route of any contract cites rule naoExiste');

  for (const item of [
    { changeId: 'field:anotacao', kind: 'field' as const, op: 'changed' as const, entity: 'Consulta' },
    { changeId: 'grant:verAgenda', kind: 'grant' as const, op: 'changed' as const, entity: '' },
    { changeId: 'task:avisar', kind: 'task' as const, op: 'added' as const, entity: '' },
  ]) {
    const row = describeEffortFrom(input(item), pages);
    assert.equal(row.status, 'abend', item.changeId);
    assert.equal(row.abend?.reason, `v1 computes only rule changed; ${item.kind} ${item.op} is not handled`);
    assert.deepEqual(row.materialize, []);
  }

  const empty = describeEffortFrom(input({
    changeId: 'rule:anotacaoObrigatoriaNoAtendimento', kind: 'rule', op: 'changed', entity: '',
  }), {});
  assert.equal(empty.status, 'abend');
  assert.equal(empty.abend?.reason, 'no generated L2 contracts for module agendaClinica');
});

void test('describeEffort abends without reading files when the project is unresolved', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 0;
  try {
    const row = await describeEffort({
      module: 'agendaClinica',
      base: { baseId: 'not-a-project', revisionId: 'x' },
      item: { changeId: 'rule:x', kind: 'rule', op: 'changed', entity: '', source: 'l4/x' },
    });
    assert.equal(row.status, 'abend');
    assert.equal(row.abend?.reason, 'cannot resolve the project of base not-a-project');
    assert.deepEqual(row.materialize, []);
  } finally {
    mls.actualProject = previous;
  }
});
