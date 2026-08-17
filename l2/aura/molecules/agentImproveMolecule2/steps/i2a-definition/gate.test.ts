/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImDefinitionGateInputs,
  runImDefinitionGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/gate.js';
import { ImDefinitionChange } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

/** The molecule as it is declared TODAY — every check is against this. */
const CURRENT = {
  slots: ['Label', 'Icon'],
  properties: ['size', 'disabled'],
  events: ['action'],
};

function change(over: Partial<ImDefinitionChange> = {}): ImDefinitionChange {
  return { kind: 'slot', op: 'add', name: 'Footer', purpose: 'aparece abaixo da árvore', ...over };
}

// O vocabulário do grupo, na forma em que uma skill o carrega (crases escapadas).
const GROUP_SKILL = '| \\`Label\\` | \\`Icon\\` | \\`Footer\\` | \\`Caption\\` | \\`size\\` | \\`action\\` | \\`change\\` |';

function inputs(over: Partial<ImDefinitionGateInputs> = {}): ImDefinitionGateInputs {
  return {
    answer: { changes: [change()], reason: 'o pedido adiciona uma área nova' },
    current: CURRENT,
    groupSkill: GROUP_SKILL,
    fromModel: true,
    ...over,
  };
}

test('a well-formed addition passes', () => {
  assert.deepEqual(runImDefinitionGate(inputs()), { ok: true, errors: [] });
});

test('a definition change that names nothing is refused, and the message offers route B', () => {
  const result = runImDefinitionGate(inputs({ answer: { changes: [], reason: 'x' } }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^no_change: /);
  assert.match(result.errors[0], /route B/);
});

test('ADDING something that already exists is refused — and named as a defect, not a definition change', () => {
  // The whole confusion route A exists to avoid: "the slot is there and does nothing" is a defect,
  // and defects are route B. Adding it a second time would move nothing.
  const result = runImDefinitionGate(inputs({ answer: { changes: [change({ name: 'Label' })], reason: 'x' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => /^already_exists: /.test(e)));
  assert.match(result.errors.join('\n'), /defects are route B/);
});

test('REMOVING something the molecule does not declare is refused, and the message lists what it has', () => {
  const result = runImDefinitionGate(inputs({ answer: { changes: [change({ op: 'remove', name: 'Ghost' })], reason: 'x' } }));
  assert.ok(result.errors.some(e => /^not_declared: /.test(e)));
  assert.match(result.errors.join('\n'), /Label, Icon/);
});

test('a rename needs the previous name, and it must exist and differ', () => {
  const missing = runImDefinitionGate(inputs({ answer: { changes: [change({ op: 'rename', name: 'Caption' })], reason: 'x' } }));
  assert.ok(missing.errors.some(e => /^previous_missing: /.test(e)));

  const noop = runImDefinitionGate(inputs({ answer: { changes: [change({ op: 'rename', name: 'Label', previousName: 'Label' })], reason: 'x' } }));
  assert.ok(noop.errors.some(e => /^rename_noop: /.test(e)));

  const ok = runImDefinitionGate(inputs({ answer: { changes: [change({ op: 'rename', name: 'Caption', previousName: 'Label' })], reason: 'x' } }));
  assert.equal(ok.ok, true);
});

test('a previous name on an op that is not a rename is refused', () => {
  const result = runImDefinitionGate(inputs({ answer: { changes: [change({ previousName: 'Label' })], reason: 'x' } }));
  assert.ok(result.errors.some(e => /^previous_off_op: /.test(e)));
});

test('the three kinds ARE the public surface, and nothing else is accepted', () => {
  const result = runImDefinitionGate(inputs({ answer: { changes: [change({ kind: 'method' as never })], reason: 'x' } }));
  assert.match(result.errors[0], /^kind_invalid: /);
  // properties and events are checked against their own lists, not against the slots
  assert.equal(runImDefinitionGate(inputs({ answer: { changes: [change({ kind: 'event', op: 'add', name: 'change' })], reason: 'x' } })).ok, true);
  assert.ok(runImDefinitionGate(inputs({ answer: { changes: [change({ kind: 'event', op: 'add', name: 'action' })], reason: 'x' } }))
    .errors.some(e => /^already_exists: /.test(e)));
});

test('every change says what it is FOR — the human reads it and i3-edit writes from it', () => {
  const result = runImDefinitionGate(inputs({ answer: { changes: [change({ purpose: '  ' })], reason: 'x' } }));
  assert.ok(result.errors.some(e => /^purpose_missing: /.test(e)));
});

test('the same element named twice is refused', () => {
  const result = runImDefinitionGate(inputs({ answer: { changes: [change(), change()], reason: 'x' } }));
  assert.ok(result.errors.some(e => /^duplicate: /.test(e)));
});

test("the MODEL's proposal must say why; the HUMAN's confirmation need not", () => {
  assert.ok(runImDefinitionGate(inputs({ answer: { changes: [change()] } })).errors.some(e => /^reason_missing: /.test(e)));
  assert.equal(runImDefinitionGate(inputs({ answer: { changes: [change()] }, fromModel: false })).ok, true);
});

test('a molecule with no events yet still accepts a first event', () => {
  const empty = { slots: [], properties: [], events: [] };
  assert.equal(runImDefinitionGate(inputs({ current: empty, answer: { changes: [change({ kind: 'event', name: 'change' })], reason: 'x' } })).ok, true);
});

// ---- a fronteira do contrato do grupo (2026-08-17) ----

test('ADICIONAR um nome que o grupo não declara é recusado — alargar grupo é trabalho manual', () => {
  // Medido na ml-kpi-indicator: "definir o rótulo por atributo" foi para a rota A e o checkpoint
  // estava pronto para adicionar a propriedade pública `label`, que groupViewMetric não declara.
  const result = runImDefinitionGate(inputs({
    answer: { changes: [change({ kind: 'property', name: 'label', purpose: 'rótulo por atributo' })], reason: 'x' },
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => /^not_in_group: /.test(e)));
  assert.match(result.errors.join('\n'), /edited by hand/);
});

test('a grafia do grupo é o que vale — `Label` passa, `label` não', () => {
  const maiuscula = runImDefinitionGate(inputs({
    answer: { changes: [change({ kind: 'slot', name: 'Footer', purpose: 'rodapé' })], reason: 'x' },
  }));
  assert.equal(maiuscula.ok, true);
});

test('RENOMEAR para um nome fora do grupo é recusado pelo mesmo motivo', () => {
  const result = runImDefinitionGate(inputs({
    answer: { changes: [change({ op: 'rename', name: 'Rodape', previousName: 'Label', purpose: 'x' })], reason: 'x' },
  }));
  assert.ok(result.errors.some(e => /^not_in_group: /.test(e)));
});

test('REMOVER não passa pelo vocabulário — o nome sai, não entra', () => {
  const result = runImDefinitionGate(inputs({
    answer: { changes: [change({ op: 'remove', name: 'Icon', purpose: 'não usamos ícone' })], reason: 'x' },
  }));
  assert.equal(result.ok, true);
});

test('sem contrato de grupo legível, admite — medição ausente não é proibição', () => {
  const result = runImDefinitionGate(inputs({
    groupSkill: '',
    answer: { changes: [change({ kind: 'property', name: 'inventada', purpose: 'x' })], reason: 'x' },
  }));
  assert.equal(result.ok, true);
});
