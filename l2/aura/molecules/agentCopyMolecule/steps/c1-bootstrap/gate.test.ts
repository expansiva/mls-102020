/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c1-bootstrap/gate.test.ts" enhancement="_blank"/>

// The admission matrix. What is being protected here is not "the gate returns an error" — it is
// that it returns ALL of them, on the whole list, before anything is written.

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CopyContext, CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { CBootstrapInputs, CItemProbe, C_BOOTSTRAP_NON_BLOCKING, formatIssues, runBootstrapGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c1-bootstrap/gate.js';

function probe(overrides: Partial<CItemProbe> = {}): CItemProbe {
  return {
    ref: '_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner',
    tsFound: true,
    className: 'IndeterminateSpinnerMolecule',
    chain: { isShell: false },
    parentTsFound: false,
    parentIsShell: false,
    lessFound: true,
    ...overrides,
  };
}

function item(shortName = 'ml-indeterminate-spinner', group = 'groupshowprogress'): CopyItem {
  return {
    origin: {
      ref: `_102040_/l2/molecules/${group}/${shortName}`,
      project: 102040,
      group,
      shortName,
      tag: `${group}--${shortName}`,
      className: 'SomeMolecule',
      chain: { isShell: false },
    },
    destination: {
      group,
      files: {
        ts: `l2/molecules/${group}/${shortName}.ts`,
        defs: `l2/molecules/${group}/${shortName}.defs.ts`,
        less: `l2/molecules/${group}/${shortName}.less`,
        html: `l2/molecules/${group}/${shortName}.html`,
      },
    },
    collision: null,
    rename: null,
    skip: false,
  };
}

function ctx(items: CopyItem[] = [item()]): CopyContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-08-19T00:00:00.000Z',
    runKey: 'run-1',
    destProject: 102053,
    mode: items.length > 1 ? 'list' : 'single',
    userLanguage: 'pt',
    userNotes: '',
    copiedFromDate: '2026-08-19',
    items,
  };
}

function inputs(overrides: Partial<CBootstrapInputs> = {}): CBootstrapInputs {
  return { parseErrors: [], expandErrors: [], refsFound: 1, probes: [probe()], context: ctx(), ...overrides };
}

test('contexto íntegro passa sem nenhuma queixa', () => {
  assert.deepEqual(runBootstrapGate(inputs()), []);
});

test('colisão NÃO é falha de admissão', () => {
  const colliding = item();
  colliding.collision = { files: ['l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts'], copiedFrom: '_102040_/... @ 2026-07-01' };
  assert.deepEqual(runBootstrapGate(inputs({ context: ctx([colliding]) })), []);
});

test('menção sem referência: erro nomeando o formato', () => {
  const issues = runBootstrapGate(inputs({ refsFound: 0, probes: [], context: null }));
  assert.ok(issues.some(issue => issue.code === 'no_ref'));
  assert.match(formatIssues(issues), /l2\/molecules/);
});

test('origem ilegível aponta a dependência declarada', () => {
  const issues = runBootstrapGate(inputs({ probes: [probe({ tsFound: false })], context: null }));
  const unreadable = issues.find(issue => issue.code === 'origin_unreadable');
  assert.ok(unreadable);
  assert.match(String(unreadable?.message), /dependência/);
});

test('casca de casca falha legível, nomeando a profundidade', () => {
  const issues = runBootstrapGate(inputs({
    probes: [probe({ chain: { isShell: true, parentRef: '_102054_/l2/molecules/g/ml-p' }, parentTsFound: true, parentIsShell: true })],
  }));
  const depth = issues.find(issue => issue.code === 'chain_depth');
  assert.ok(depth);
  assert.match(String(depth?.message), /profundidade/);
});

test('casca com pai ilegível: erro próprio, diferente de casca de casca', () => {
  const issues = runBootstrapGate(inputs({
    probes: [probe({ chain: { isShell: true, parentRef: '_102040_/l2/molecules/g/ml-p' }, parentTsFound: false })],
  }));
  assert.ok(issues.some(issue => issue.code === 'parent_unreadable'));
  assert.ok(!issues.some(issue => issue.code === 'chain_depth'));
});

test('erro na cadeia (import ausente) interrompe as checagens daquele item, não da lista', () => {
  const issues = runBootstrapGate(inputs({
    probes: [probe({ chainError: 'a origem estende X, mas o import não foi encontrado' }), probe({ ref: 'outra', tsFound: true })],
    context: ctx([item(), item('ml-outra')]),
  }));
  assert.equal(issues.filter(issue => issue.code === 'chain').length, 1);
});

test('TODOS os erros da lista de uma vez (fail-fast, decisão 2)', () => {
  const issues = runBootstrapGate(inputs({
    parseErrors: ["referência inválida 'x'"],
    expandErrors: ["grupo 'y' não tem moléculas legíveis"],
    probes: [
      probe({ ref: 'a', tsFound: false }),
      probe({ ref: 'b', className: '' }),
      probe({ ref: 'c', lessFound: false }),
    ],
    context: ctx(),
  }));
  const codes = issues.map(issue => issue.code);
  assert.ok(codes.includes('ref_invalid'));
  assert.ok(codes.includes('group_empty'));
  assert.ok(codes.includes('origin_unreadable'));
  assert.ok(codes.includes('origin_class'));
  assert.ok(codes.includes('origin_less_missing'));
  assert.ok(issues.length >= 5, 'a admissão não pode parar no primeiro erro');
});

test('contexto vazio depois da expansão é erro', () => {
  const issues = runBootstrapGate(inputs({ probes: [], context: ctx([]) }));
  assert.ok(issues.some(issue => issue.code === 'empty'));
});

test('dois itens escrevendo o mesmo arquivo é erro', () => {
  const issues = runBootstrapGate(inputs({ probes: [probe(), probe()], context: ctx([item(), item()]) }));
  assert.ok(issues.some(issue => issue.code === 'duplicate'));
});

test('metadados do contexto: runKey, projeto e data de proveniência', () => {
  const broken = { ...ctx(), runKey: '', destProject: 0, copiedFromDate: '19/08/2026' };
  const issues = runBootstrapGate(inputs({ context: broken as CopyContext }));
  const codes = issues.map(issue => issue.code);
  assert.ok(codes.includes('run_key'));
  assert.ok(codes.includes('dest_project'));
  assert.ok(codes.includes('copied_from_date'));
});

test('casca sem parentRef no contexto é incoerência detectada', () => {
  const shell = item();
  shell.origin.chain = { isShell: true };
  const issues = runBootstrapGate(inputs({
    probes: [probe({ chain: { isShell: true, parentRef: '_102040_/l2/molecules/g/ml-p' }, parentTsFound: true })],
    context: ctx([shell]),
  }));
  assert.ok(issues.some(issue => issue.code === 'parent_ref'));
});

// Regressão do Studio (2026-08-20): uma molécula sem aparência própria não pode abortar o lote.
test('origem sem .less é AVISO, não bloqueio', () => {
  const issues = runBootstrapGate(inputs({ probes: [probe({ lessFound: false })] }));
  assert.deepEqual(issues.map(issue => issue.code), ['origin_less_missing']);
  assert.ok(C_BOOTSTRAP_NON_BLOCKING.includes('origin_less_missing'));
  const blocking = issues.filter(issue => !C_BOOTSTRAP_NON_BLOCKING.includes(issue.code));
  assert.deepEqual(blocking, [], 'nada bloqueante: o lote segue');
});
