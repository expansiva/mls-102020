/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/plan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';

const MASTER = '102020';

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

type Answer = {
  master: { project: string };
  create: Array<{ kind: string; id: string; path: string }>;
  regenerateDefs: Array<{ kind: string; id: string; path: string }>;
  materialize: Array<{ kind: string; id: string; path: string }>;
  contract: string;
};

type EffortFile = {
  perItem: Array<{ answers: Answer[] }>;
  merged: unknown;
  status: string;
};

function retie(effort: EffortFile): EffortFile {
  effort.merged = mergeChangeEffort(effort.perItem as never);
  const answers = effort.perItem.flatMap(row => row.answers);
  effort.status = answers.some(answer => answer.contract === 'change') ? 'contract' : 'simple';
  return effort;
}

test('R1 only materializes the named page and ignores the other master', () => {
  assert.deepEqual(planNewReleaseL2(fixture('r1'), MASTER), {
    ok: true,
    mode: 'materialize',
    pages: ['minhas_tarefas'],
    materializeOnly: [],
  });
});

test('pages stay in first-seen order without repetition', () => {
  assert.deepEqual(planNewReleaseL2(fixture('order'), MASTER), {
    ok: true,
    mode: 'materialize',
    pages: ['segunda', 'primeira'],
    materializeOnly: [],
  });
});

test('R3 regenerateDefs of contract and shared rebuilds those pages', () => {
  const effort = fixture('r3') as EffortFile;
  const answer = effort.perItem[0].answers[0];
  answer.regenerateDefs = [
    { kind: 'contract', id: 'minhas_tarefas', path: 'l2/tarefas/web/contracts/minhas_tarefas.defs.ts' },
    { kind: 'shared', id: 'inicio', path: 'l2/tarefas/web/shared/inicio.defs.ts' },
  ];
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'regenerate',
    pages: ['minhas_tarefas', 'inicio'],
    materializeOnly: [],
  });
});

test('R4 contract change rebuilds the cited page', () => {
  const effort = fixture('r4') as EffortFile;
  const answer = effort.perItem[0].answers[0];
  answer.materialize = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
  ];
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'regenerate',
    pages: ['tarefas_equipe'],
    materializeOnly: [],
  });
});

test('R1 and R4 in one file keep the materialize-only page beside the rebuild', () => {
  const r1 = fixture('r1') as EffortFile;
  const effort = fixture('r4') as EffortFile;
  const rebuild = effort.perItem[0].answers[0];
  rebuild.materialize = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
  ];
  const materializeAnswer = r1.perItem[0].answers.find(answer => answer.master.project === MASTER);
  if (!materializeAnswer) throw new Error('R1 has no answer for this master');
  effort.perItem[0].answers.push(materializeAnswer);
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'regenerate',
    pages: ['tarefas_equipe'],
    materializeOnly: ['minhas_tarefas'],
  });
});

test('abend refuses with the master reason', () => {
  assert.deepEqual(planNewReleaseL2(fixture('abend'), MASTER), {
    ok: false,
    reason: 'not in this release step: field:prioridade abend: module has no declared languages',
  });
});

test('nothing to apply when this master has no page', () => {
  assert.deepEqual(planNewReleaseL2(fixture('nothing'), MASTER), { ok: false, reason: 'nothing to apply' });
});

test('invalid file refuses with the gate reason', () => {
  const plan = planNewReleaseL2(fixture('invalid'), MASTER);
  assert.equal(plan.ok, false);
  if (plan.ok) return;
  assert.match(plan.reason, /^changeEffort rejected by gate: /);
  assert.match(plan.reason, /schema:schemaVersion/);
});
